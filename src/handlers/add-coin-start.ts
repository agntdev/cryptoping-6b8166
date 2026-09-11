import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { coinKeyboard, list, tickerId, validTicker } from "./crypto.js";

// SCAFFOLD — generated from the bot blueprint BEFORE the agent runs.
// Keep a LIVE registration (.command / .callbackQuery / …) so this feature is
// never an empty stub. Replace the reply body with real logic + copy; if you
// change the user-facing text, update tests/specs to match EXACTLY.
// Do NOT rewrite src/bot.ts — buildBot() already auto-loads this module.
// Menu: wire this into /start via registerMainMenuItem({ label: "Add coin", data: "add_coin:start" }) if the toolkit exposes it.

registerMainMenuItem({ label: "Add coin", data: "add_coin:start", order: 10 });
const composer = new Composer<Ctx>();

composer.callbackQuery("add_coin:start", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "ticker";
  await ctx.reply("Enter a ticker symbol, such as ADA.", { reply_markup: { force_reply: true, input_field_placeholder: "Ticker symbol" } });
});

composer.callbackQuery(/^add_coin:(BTC|ETH|TON|ADA|SOL|DOGE|XRP)$/, async (ctx) => {
  await ctx.answerCallbackQuery(); const ticker = ctx.match[1]; const items = list(ctx);
  if (items[ticker]) { await ctx.editMessageText(`${ticker} is already on your watchlist.`, { reply_markup: coinKeyboard(ticker) }); return; }
  items[ticker] = { rules: [] }; await ctx.editMessageText(`${ticker} is on your watchlist.`, { reply_markup: coinKeyboard(ticker) });
});
composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "ticker") return next();
  const ticker = validTicker(ctx.message.text); ctx.session.step = undefined;
  if (!ticker || !tickerId(ticker)) { await ctx.reply(`Couldn't confirm ${ticker || "that ticker"}. Try BTC, ETH, TON, ADA, SOL, DOGE, or XRP.`, { reply_markup: inlineKeyboard([[inlineButton("Add ADA", "add_coin:ADA")]]) }); return; }
  const items = list(ctx); if (!items[ticker]) items[ticker] = { rules: [] };
  await ctx.reply(`${ticker} is on your watchlist.`, { reply_markup: coinKeyboard(ticker) });
});

export default composer;
