import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { mainMenuKeyboard, inlineKeyboard, inlineButton } from "../toolkit/index.js";
import { profile } from "./crypto.js";

// The /start handler renders the bot's MAIN MENU — the primary way users operate
// a button-first bot. A feature adds its own button by calling
// `registerMainMenuItem(...)` in its own `src/handlers/<slug>.ts`; this handler
// renders whatever is registered (plus a Help button), so you do NOT edit this
// file to add a feature. Send ONE message — no placeholder line above the menu.
const composer = new Composer<Ctx>();

const WELCOME = "CryptoPing keeps your watchlist and price alerts private. Add a coin, set an alert, or check prices when you need them.";

composer.command("start", async (ctx) => {
  profile(ctx);
  await ctx.reply(WELCOME, { reply_markup: inlineKeyboard([[inlineButton("Add BTC", "add_coin:BTC"), inlineButton("Add ETH", "add_coin:ETH"), inlineButton("Add TON", "add_coin:TON")], [inlineButton("Add custom ticker", "add_coin:start")], ...mainMenuKeyboard().inline_keyboard]) });
});

// "Back to menu" — re-render the main menu in place from any sub-view.
composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

export default composer;
