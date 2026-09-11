import { Composer } from "grammy";
import type { AlertRule, Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { addRule, coinKeyboard, list, profile, ruleId } from "./crypto.js";

const composer = new Composer<Ctx>();
composer.callbackQuery(/^watchlist:configure:([A-Z]+)$/, async (ctx) => {
  await ctx.answerCallbackQuery(); const ticker = ctx.match[1];
  if (!list(ctx)[ticker]) { await ctx.editMessageText("That coin is no longer on your watchlist."); return; }
  ctx.session.ticker = ticker;
  await ctx.editMessageText(`Set an alert for ${ticker}.`, { reply_markup: inlineKeyboard([[inlineButton("Absolute price", "alert:absolute"), inlineButton("Percent move", "alert:percent")], [inlineButton("Back", "watchlist:open")]]) });
});
composer.callbackQuery("alert:absolute", async (ctx) => { await ctx.answerCallbackQuery(); ctx.session.step = "absolute"; await ctx.editMessageText("Choose when the price should alert you.", { reply_markup: inlineKeyboard([[inlineButton("Above", "alert:dir:above"), inlineButton("Below", "alert:dir:below")]]) }); });
composer.callbackQuery(/^alert:dir:(above|below)$/, async (ctx) => { await ctx.answerCallbackQuery(); ctx.session.direction = ctx.match[1] as "above" | "below"; await ctx.reply("Enter the target price in US dollars.", { reply_markup: { force_reply: true, input_field_placeholder: "Example: 75000" } }); });
composer.callbackQuery("alert:percent", async (ctx) => { await ctx.answerCallbackQuery(); ctx.session.step = "percent"; await ctx.editMessageText("Choose the price move.", { reply_markup: inlineKeyboard([[inlineButton("Increase", "alert:pdir:increase"), inlineButton("Decrease", "alert:pdir:decrease"), inlineButton("Either", "alert:pdir:both")]]) }); });
composer.callbackQuery(/^alert:pdir:(increase|decrease|both)$/, async (ctx) => { await ctx.answerCallbackQuery(); ctx.session.direction = ctx.match[1] as AlertRule["direction"]; await ctx.reply("Enter the percentage move.", { reply_markup: { force_reply: true, input_field_placeholder: "Example: 5" } }); });
composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "absolute" && ctx.session.step !== "percent") return next();
  const amount = Number(ctx.message.text.trim()); const ticker = ctx.session.ticker; const type = ctx.session.step;
  if (!ticker || !ctx.session.direction || !Number.isFinite(amount) || amount <= 0) { await ctx.reply("Enter a positive number to save this alert."); return; }
  const rule: AlertRule = { id: ruleId(), type, direction: ctx.session.direction, threshold: amount, window: type === "percent" ? 60 : 0, createdAt: new Date().toISOString() };
  const duplicate = list(ctx)[ticker].rules.some((item) => item.type === rule.type && item.direction === rule.direction && item.threshold === rule.threshold && item.window === rule.window);
  ctx.session.step = undefined; ctx.session.direction = undefined;
  if (duplicate) { await ctx.reply(`That ${ticker} alert already exists.`, { reply_markup: coinKeyboard(ticker) }); return; }
  addRule(ctx, ticker, rule); const cooldown = profile(ctx).timezone ? 60 : 60;
  const description = type === "absolute" ? `${rule.direction} $${amount}` : `${rule.direction} ${amount}% over 1 hour`;
  await ctx.reply(`${ticker} alert saved: ${description}. Cooldown: ${cooldown} minutes.`, { reply_markup: coinKeyboard(ticker) });
});
export default composer;
