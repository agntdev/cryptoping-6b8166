import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { getPrices, list, now, profile } from "./crypto.js";

function inQuietHours(ctx: Ctx, date = now()) { const { quietStart, quietEnd } = profile(ctx); if (!quietStart || !quietEnd) return false; const clock = date.toISOString().slice(11, 16); return quietStart < quietEnd ? clock >= quietStart && clock < quietEnd : clock >= quietStart || clock < quietEnd; }
export async function evaluateAlerts(ctx: Ctx): Promise<void> {
  const items = list(ctx); const tickers = Object.keys(items); if (!tickers.length) return;
  let prices: Record<string, { price: number; change: number }>; try { prices = await getPrices(tickers); } catch { return; }
  for (const ticker of tickers) for (const rule of items[ticker].rules) {
    const value = prices[ticker]; if (!value || (rule.cooldownUntil ?? 0) > now().getTime()) continue;
    const triggers = rule.type === "absolute" ? (rule.direction === "above" ? value.price >= rule.threshold : value.price <= rule.threshold) : (rule.direction === "increase" ? value.change >= rule.threshold : rule.direction === "decrease" ? value.change <= -rule.threshold : Math.abs(value.change) >= rule.threshold);
    if (!triggers) continue;
    rule.cooldownUntil = now().getTime() + 60 * 60 * 1000; items[ticker].lastPrice = value.price;
    if (inQuietHours(ctx)) { const queue = (ctx.session.queued ??= []); if (queue.length < 50) queue.push({ ruleId: rule.id, ticker, price: value.price, triggeredAt: now().toISOString() }); }
    else await ctx.api.sendMessage(ctx.chat!.id, `${ticker} alert: ${rule.direction} rule triggered at $${value.price}.`);
  }
}
export async function deliverQueuedAlerts(ctx: Ctx): Promise<void> { if (inQuietHours(ctx)) return; const queued = ctx.session.queued ?? []; for (const item of queued) await ctx.api.sendMessage(ctx.chat!.id, `${item.ticker} alert triggered at $${item.price}. Original trigger time: ${item.triggeredAt}.`); ctx.session.queued = []; }

// Every incoming user interaction is also a safe opportunity to release alerts
// that waited for quiet hours to end. Scheduled Worker invocations can call the
// exported evaluator as well.
const composer = new Composer<Ctx>();
composer.on("message", async (ctx, next) => { await deliverQueuedAlerts(ctx); return next(); });
export default composer;
