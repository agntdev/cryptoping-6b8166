import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { getPrices, list, money, tickerId, validTicker } from "./crypto.js";

// SCAFFOLD — generated from the bot blueprint BEFORE the agent runs.
// Keep a LIVE registration (.command / .callbackQuery / …) so this feature is
// never an empty stub. Replace the reply body with real logic + copy; if you
// change the user-facing text, update tests/specs to match EXACTLY.
// Do NOT rewrite src/bot.ts — buildBot() already auto-loads this module.

registerMainMenuItem({ label: "Check prices", data: "price:watchlist", order: 40 });
const composer = new Composer<Ctx>();

async function showPrice(ctx: Ctx, input?: string) {
  const requested = input?.trim().toUpperCase(); const tickers = requested && requested !== "ALL" ? [validTicker(requested)] : Object.keys(list(ctx));
  if (!tickers.length) { await ctx.reply("No coins yet — add one before checking prices.", { reply_markup: inlineKeyboard([[inlineButton("Add coin", "add_coin:start")]]) }); return; }
  if (requested && requested !== "ALL" && !tickerId(tickers[0])) { await ctx.reply(`Couldn't confirm ${requested}. Try BTC, ETH, TON, ADA, SOL, DOGE, or XRP.`); return; }
  try { const values = await getPrices(tickers); const lines = tickers.map((ticker) => { const value = values[ticker]; if (!value) return `${ticker}: unavailable`; return `${ticker}: ${money(value.price)} (${value.change >= 0 ? "+" : ""}${value.change.toFixed(2)}% 1h)`; }); await ctx.reply(lines.join("\n"), { reply_markup: inlineKeyboard(tickers.map((ticker) => [inlineButton(`${ticker} alerts`, `watchlist:configure:${ticker}`)])) }); }
  catch { await ctx.reply("Price feed is unavailable right now. Try again shortly."); }
}
composer.command("price", async (ctx) => { const input = ctx.match?.trim(); await showPrice(ctx, input); });
composer.callbackQuery("price:watchlist", async (ctx) => { await ctx.answerCallbackQuery(); await showPrice(ctx); });

export default composer;
