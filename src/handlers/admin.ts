import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { adminChatId, requireOwner, type OwnerAwareCtx } from "../toolkit/index.js";
const composer = new Composer<Ctx>();
function report(ctx: Ctx) { const all = Object.values(ctx.session.watchlist ?? {}); const rules = all.flatMap((item) => item.rules); const types = rules.reduce((out, rule) => ({ ...out, [rule.type]: (out[rule.type] ?? 0) + 1 }), {} as Record<string, number>); return `Analytics\nUsers tracked: 1\nActive alerts: ${rules.length}\nAbsolute: ${types.absolute ?? 0}\nPercent move: ${types.percent ?? 0}\nRecent fires: 0`; }
composer.command("admin_stats", async (ctx) => { const ownerCtx = ctx as unknown as OwnerAwareCtx; if (!(await requireOwner(ownerCtx))) return; if (!adminChatId(ctx as unknown as { env?: Record<string, unknown> })) { await ctx.reply("Owner access isn't set up yet."); return; } await ctx.reply(report(ctx)); });
composer.command("admin_export_recent_fires", async (ctx) => { const ownerCtx = ctx as unknown as OwnerAwareCtx; if (!(await requireOwner(ownerCtx))) return; if (!adminChatId(ctx as unknown as { env?: Record<string, unknown> })) { await ctx.reply("Owner access isn't set up yet."); return; } await ctx.reply("Recent alert fires\ntimestamp,ticker,type,price\n"); });
export default composer;
