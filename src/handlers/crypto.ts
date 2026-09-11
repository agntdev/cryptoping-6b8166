import { Composer } from "grammy";
import type { Ctx, AlertRule } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const ids: Record<string, string> = { BTC: "bitcoin", ETH: "ethereum", TON: "the-open-network", ADA: "cardano", SOL: "solana", DOGE: "dogecoin", XRP: "ripple" };
export const now = () => new Date();
export function profile(ctx: Ctx) { return (ctx.session.profile ??= { timezone: "UTC", analytics: true }); }
export function list(ctx: Ctx) { return (ctx.session.watchlist ??= {}); }
export function validTicker(raw: string) { return raw.trim().toUpperCase().replace(/[^A-Z]/g, ""); }
export function tickerId(ticker: string) { return ids[ticker]; }
export function coinKeyboard(ticker: string) { return inlineKeyboard([[inlineButton("Configure alerts", `watchlist:configure:${ticker}`), inlineButton("Remove", `watchlist:remove:${ticker}`)], [inlineButton("Back to watchlist", "watchlist:open")]]); }
export async function getPrices(tickers: string[]): Promise<Record<string, { price: number; change: number }>> {
  if (!tickers.length) return {};
  const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(tickers.map((ticker) => `${ticker}USDT`)))}`);
  if (!response.ok) throw new Error("feed");
  const data = await response.json() as Array<{ symbol: string; lastPrice: string; priceChangePercent: string }>;
  return Object.fromEntries(data.map((row) => [row.symbol.replace("USDT", ""), { price: Number(row.lastPrice), change: Number(row.priceChangePercent) / 24 }]));
}
export function money(value: number) { return value >= 1 ? `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : `$${value.toFixed(6)}`; }
export function timeValid(value: string) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
export function rules(ctx: Ctx, ticker: string) { return list(ctx)[ticker]?.rules ?? []; }
export function addRule(ctx: Ctx, ticker: string, rule: AlertRule) { list(ctx)[ticker].rules.push(rule); }
export function ruleId() { return `${now().getTime()}-${crypto.randomUUID()}`; }

// This module also exposes the live feed-status action used by the help surface.
const composer = new Composer<Ctx>();
composer.callbackQuery("crypto:source", async (ctx) => { await ctx.answerCallbackQuery(); await ctx.reply("Prices are checked against the live market feed when you request them."); });
export default composer;
