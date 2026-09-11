import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { profile, timeValid } from "./crypto.js";

// SCAFFOLD — generated from the bot blueprint BEFORE the agent runs.
// Keep a LIVE registration (.command / .callbackQuery / …) so this feature is
// never an empty stub. Replace the reply body with real logic + copy; if you
// change the user-facing text, update tests/specs to match EXACTLY.
// Do NOT rewrite src/bot.ts — buildBot() already auto-loads this module.
// Menu: wire this into /start via registerMainMenuItem({ label: "Set quiet hours", data: "settings:quiet_hours" }) if the toolkit exposes it.

registerMainMenuItem({ label: "Quiet hours", data: "settings:quiet_hours", order: 30 });
const composer = new Composer<Ctx>();

composer.callbackQuery("settings:quiet_hours", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("Choose when alerts should wait.", { reply_markup: inlineKeyboard([[inlineButton("22:00–08:00", "quiet:22:08"), inlineButton("23:00–07:00", "quiet:23:07")], [inlineButton("Set custom hours", "quiet:custom"), inlineButton("Turn off", "quiet:off")]]) });
});
composer.callbackQuery(/^quiet:(22|23):(08|07)$/, async (ctx) => { await ctx.answerCallbackQuery(); const start = `${ctx.match[1]}:00`; const end = `${ctx.match[2]}:00`; Object.assign(profile(ctx), { quietStart: start, quietEnd: end }); await ctx.editMessageText(`Quiet hours saved: ${start}–${end}.`); });
composer.callbackQuery("quiet:custom", async (ctx) => { await ctx.answerCallbackQuery(); ctx.session.step = "quiet"; await ctx.reply("Enter quiet hours as HH:MM-HH:MM.", { reply_markup: { force_reply: true, input_field_placeholder: "22:00-08:00" } }); });
composer.callbackQuery("quiet:off", async (ctx) => { await ctx.answerCallbackQuery(); const p = profile(ctx); delete p.quietStart; delete p.quietEnd; await ctx.editMessageText("Quiet hours are off."); });
composer.on("message:text", async (ctx, next) => { if (ctx.session.step !== "quiet") return next(); const [start, end] = ctx.message.text.trim().split("-"); if (!start || !end || !timeValid(start) || !timeValid(end) || start === end) { await ctx.reply("Use two different times, for example 22:00-08:00."); return; } Object.assign(profile(ctx), { quietStart: start, quietEnd: end }); ctx.session.step = undefined; await ctx.reply(`Quiet hours saved: ${start}–${end}.`); });

export default composer;
