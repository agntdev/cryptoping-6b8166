import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { confirmKeyboard, inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { coinKeyboard, list } from "./crypto.js";

// SCAFFOLD — generated from the bot blueprint BEFORE the agent runs.
// Keep a LIVE registration (.command / .callbackQuery / …) so this feature is
// never an empty stub. Replace the reply body with real logic + copy; if you
// change the user-facing text, update tests/specs to match EXACTLY.
// Do NOT rewrite src/bot.ts — buildBot() already auto-loads this module.
// Menu: wire this into /start via registerMainMenuItem({ label: "Manage watchlist", data: "watchlist:open" }) if the toolkit exposes it.

registerMainMenuItem({ label: "Manage watchlist", data: "watchlist:open", order: 20 });
const composer = new Composer<Ctx>();

composer.callbackQuery("watchlist:open", async (ctx) => {
  await ctx.answerCallbackQuery();
  const tickers = Object.keys(list(ctx));
  if (!tickers.length) { await ctx.reply("No coins yet — tap Add coin to start.", { reply_markup: inlineKeyboard([[inlineButton("Add coin", "add_coin:start")]]) }); return; }
  await ctx.reply(`Your watchlist: ${tickers.join(", ")}.`, { reply_markup: inlineKeyboard([...tickers.map((ticker) => [inlineButton(`${ticker} alerts`, `watchlist:configure:${ticker}`), inlineButton(`Remove ${ticker}`, `watchlist:remove:${ticker}`)]), [inlineButton("Add coin", "add_coin:start")]]) });
});
composer.callbackQuery(/^watchlist:remove:([A-Z]+)$/, async (ctx) => { await ctx.answerCallbackQuery(); const ticker = ctx.match[1]; await ctx.editMessageText(`Remove ${ticker} and its alerts?`, { reply_markup: confirmKeyboard(`remove:${ticker}`, { yes: "Remove", no: "Keep" }) }); });
composer.callbackQuery(/^remove:([A-Z]+):(yes|no)$/, async (ctx) => { await ctx.answerCallbackQuery(); const [, ticker, answer] = ctx.match; if (answer === "no") { await ctx.editMessageText(`${ticker} is still on your watchlist.`, { reply_markup: coinKeyboard(ticker) }); return; } delete list(ctx)[ticker]; ctx.session.queued = (ctx.session.queued ?? []).filter((item) => item.ticker !== ticker); await ctx.editMessageText(`${ticker} was removed.`); });

export default composer;
