# CryptoPing Alerts — Bot specification

**Archetype:** finance

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

Private, low-noise crypto price alert bot that lets each user maintain a personal watchlist, configure absolute and percent-move alerts, set quiet hours and daily morning summaries, query current prices on demand, and provides the owner with adoption and alert-fire analytics.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- Retail crypto traders
- Hobbyist investors
- Users who want private, low-noise price alerts

## Success criteria

- User can add/remove tickers and configure per-coin alerts via inline buttons and short text prompts.
- Alerts deliver privately to each user's Telegram chat and respect quiet hours and per-rule cooldowns.
- Users can run /price [ticker|all] to get current price and 1h percent change for watchlist items.
- Queued alerts triggered during quiet hours are delivered after quiet hours end and labeled with original trigger time.
- Owner (ADMIN_CHAT_ID) receives weekly top-10 alert-fire report and can request on-demand analytics via an admin command.
- Persistent storage contains user profiles, watchlists, alert rules, last-notified prices, cooldown timestamps, queued alerts, and owner stats.

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open the main menu and onboarding; shows seed watchlist Quick Add buttons and 'Add custom ticker'.
  - outputs: Welcome message, quick-add inline buttons (BTC, ETH, TON), 'Add custom ticker' button, 'Help' button
- **/help** (command, actor: user, command: /help) — Show concise usage hints and links to common flows (add coin, set alert, /price).
  - outputs: Short help text and actionable inline buttons
- **/price** (command, actor: user, command: /price) — Return current price for a ticker or the user's watchlist; use argument for specific ticker or 'all'.
  - inputs: optional: ticker symbol or 'all'
  - outputs: Current price, 1h percent change, friendly error on feed failure
- **Add coin** (button, actor: user, callback: add_coin:start) — Launch add-coin flow; offers seed coins and 'Add custom ticker' entry.
  - inputs: button press or typed ticker (ForceReply)
  - outputs: Validation result, confirmation, suggestion list on typos
- **Manage watchlist** (button, actor: user, callback: watchlist:open) — Open user's watchlist with per-coin inline actions: View, Remove, Configure alerts.
  - outputs: List of watchlist coins with per-coin action buttons
- **Set quiet hours** (button, actor: user, callback: settings:quiet_hours) — Open quiet-hours configuration UI (buttons for common ranges + custom time input).
  - inputs: selected range or typed times
  - outputs: Quiet hours saved, confirmation

## Flows

### Onboarding /start
_Trigger:_ /start

1. Bot greets user and explains features in one paragraph
2. Show Quick Add inline buttons for BTC, ETH, TON and 'Add custom ticker' button
3. Offer 'Manage watchlist', 'Set quiet hours', 'Enable morning summary' buttons
4. Persist new user profile with timezone (prompt if unknown) and defaults

_Data touched:_ UserProfile, WatchlistItem

### Add coin (quick button or custom ticker)
_Trigger:_ callback add_coin:start or ForceReply text

1. If quick button: add seed ticker to user's watchlist and confirm
2. If custom: ForceReply asks for ticker symbol; run validation
3. On ambiguous ticker, prompt user to choose market/quote or suggest corrections
4. On successful validation persist WatchlistItem; show 'Configure alerts' and 'Remove' buttons

_Data touched:_ WatchlistItem

### Remove coin
_Trigger:_ callback watchlist:remove:<ticker>

1. Confirm removal with yes/no inline buttons
2. On yes: remove WatchlistItem, cancel queued alerts for that coin, confirm to user

_Data touched:_ WatchlistItem, QueuedAlert

### Configure alert (per coin)
_Trigger:_ callback watchlist:configure:<ticker>

1. Show alert types: 'Absolute price' and 'Percent move' as buttons
2. For Absolute: prompt for above/below choice then ForceReply numeric price
3. For Percent: prompt for direction (+/-/both), percent value and sliding window (1h default; options up to 24h)
4. Save AlertRule and show confirmation including cooldown preview

_Data touched:_ AlertRule, WatchlistItem, UserProfile

### Immediate price check (/price)
_Trigger:_ /price [ticker|all]

1. If ticker provided: validate and fetch price; on success return price and 1h percent change
2. If no arg: list watchlist items with current price and 1h percent change; show quick action buttons per coin
3. On feed failure return friendly error and suggestion

### Background alert evaluation
_Trigger:_ periodic scheduler (e.g., every 1m or per configured cadence)

1. For each user and each WatchlistItem evaluate AlertRules using price feed
2. If rule triggers and not in cooldown: if inside quiet hours queue the alert; else send alert and mark cooldown
3. Persist last-notified price, cooldown-until, and increment owner stats counters

_Data touched:_ AlertRule, WatchlistItem, QueuedAlert, OwnerStats, UserProfile

### Quiet hours end delivery
_Trigger:_ quiet hours end time event for a user

1. Deliver queued alerts in chronological order labeled with original trigger timestamp
2. Respect per-rule cooldowns when delivering queued alerts (do not duplicate if cooldown applies)
3. Clear delivered queued alerts

_Data touched:_ QueuedAlert, WatchlistItem, AlertRule

### Morning summary scheduling
_Trigger:_ user enables morning summary and selects local time

1. At user local time generate summary: list of watchlist prices, top percent movers in the chosen window, near-threshold alerts
2. Send summary when not in quiet hours; if in quiet hours queue and deliver after quiet hours with label
3. Allow user to disable or change time

_Data touched:_ UserProfile, WatchlistItem

### Admin analytics (owner)
_Trigger:_ /admin_stats (owner only) or weekly scheduled report

1. Aggregate total users, top-10 most-fired alerts by ticker and alert type, recent-fire logs
2. Send report to ADMIN_CHAT_ID with simple counts and top list
3. Allow owner to request 'export recent-fires' (owner-only) to receive logs or CSV

_Data touched:_ OwnerStats, RecentFireLog

## Owner-supplied settings

The OWNER provides these; they are collected in chat and injected into the environment at deploy. Read each one from the environment where it is used (`ctx.env.<KEY>` / `env.<KEY>` on Cloudflare Workers; `process.env.<KEY>` only as a Node/harness fallback — never the sole read). Do NOT invent your own way of learning the value, do NOT ask for it in a bot message, and do NOT hardcode a default.

- **ADMIN_CHAT_ID** — where owner/admin notifications and weekly stats are sent
  - this is the OWNER's own chat id; the platform already knows it. Read `ADMIN_CHAT_ID` via `ctx.env` (prefer toolkit `adminChatId` / `requireOwner`) — never ask a user, never treat whoever writes first as the admin, never invent claim-admin or open manage for everyone.
  - may be UNSET at runtime: the bot must still start, and the feature needing ADMIN_CHAT_ID must say so plainly instead of failing.

Your behavioral specs run WITHOUT these values, so no spec may depend on one.

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

An entity that merely NAMES an owner-supplied setting above (an admin chat, an API account) is not something to store or discover — read it from the environment.

- **UserProfile** _(retention: persistent)_ — Per-user settings and metadata
  - fields: chat_id (telegram id), timezone (IANA or offset), quiet_hours_start (local time), quiet_hours_end (local time), morning_summary_time (local time or null), cooldown_minutes_default (integer), created_at, last_active_at
- **WatchlistItem** _(retention: persistent)_ — A ticker saved by a user and its per-coin state
  - fields: user_chat_id, ticker_symbol (normalized, e.g. BTC), friendly_name (optional), active_alert_ids (list), last_notified_price (decimal), cooldown_until_by_rule (map alert_id -> timestamp), created_at
- **AlertRule** _(retention: persistent)_ — A per-coin alert rule (absolute or percent)
  - fields: id, user_chat_id, ticker_symbol, type (absolute|percent), direction (above|below|increase|decrease|both), threshold_value (decimal for price or percent), window_minutes (for percent rules), cooldown_minutes (overrides user default if set), enabled (bool), created_at
- **QueuedAlert** _(retention: persistent)_ — Alert instance captured during quiet hours to be delivered later
  - fields: id, user_chat_id, alert_rule_id, ticker_symbol, trigger_price, trigger_time_utc, queued_at, delivered_at (nullable)
- **OwnerStats** _(retention: persistent)_ — Aggregated owner analytics and recent fire logs
  - fields: total_users, alert_fires_by_ticker (map), alert_fires_by_type (map), recent_fire_log (append-only, capped list with timestamps)

## Integrations

- **Telegram** (required) — Bot API messaging, inline keyboards, commands and callbacks
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Receive weekly top-10 alert-fire report in ADMIN_CHAT_ID
- /admin_stats — request on-demand aggregated stats (total users, top tickers, alert-type breakdown)
- /admin_export_recent_fires — request export of recent fire logs (owner-only)
- Ability to opt out of analytics collection (owner config; default enabled)

## Notifications

- Immediate alert messages to user chat (when not in quiet hours), stating rule, ticker, trigger price, current price, and time.
- Queued alerts delivered after quiet hours end, labeled with original trigger timestamp.
- Daily morning summary at user-chosen local time when enabled.
- Confirmation messages after adding/removing tickers and after setting alert rules.
- Friendly error messages when price feed fails or ticker is invalid.
- Admin weekly top-10 report and on-demand /admin_stats response to ADMIN_CHAT_ID.

## Permissions & privacy

- All price alerts and watchlists are private to each user's Telegram chat; no user data shared to other users.
- Owner receives aggregated and anonymized counts (total users, most-fired tickers, alert-type counts) only; no individual user PII in owner reports.
- Persisted data is limited to what is necessary: chat_id (for delivery), timezone, settings, watchlist and alert metadata, and recent-fire logs.
- Provide a user command to export or delete their data (data portability and deletion endpoint behavior must be implemented).
- Timezones and local times are requested/stored with user consent.

## Edge cases

- Price feed failures: retry silently; if user requests /price or attempts to add ticker and feed is still unavailable, show friendly error and ask to try later.
- Ambiguous ticker symbols: ask the user to confirm which market/symbol and provide suggestions; do not assume a default market without confirmation.
- Duplicate alerts: prevent exact-duplicate alert rules; confirm when user attempts to create overlapping rules.
- Alerts triggered repeatedly by noisy price action: respect per-rule cooldowns and global rate limits per user to avoid spam.
- Long quiet-hours windows causing large queued-alert volumes: cap queued alerts per user (configurable owner-side limit) and combine similar alerts into summaries where possible.
- Daylight saving / timezone changes: store timezone as IANA where possible and recalibrate scheduled events when timezone changes are detected.
- Delisted or deprecated tickers: detect delisting via price feed and notify user with instructions to remove or replace ticker.
- User changes cooldown/quiet hours while alerts are queued: apply new quiet-hours immediately for future triggers; queued alerts use the original trigger time label and deliver when new quiet-hours window ends.

## Required tests

- Onboarding acceptance: /start shows seed Quick Add buttons; pressing BTC adds BTC to watchlist and confirms.
- Add custom ticker path: entering 'ADA' validates, persists, and shows configure-alert options; typo 'ADAA' returns suggestions.
- Configure absolute and percent alerts: create, persist, and see confirmation with cooldown shown.
- Background alert firing: simulate price feed values to trigger a rule; verify alert sent, cooldown applied, owner stats incremented.
- Quiet hours behavior: trigger an alert during quiet hours; verify it is queued and delivered labeled with trigger time after quiet hours end.
- Cooldown enforcement: trigger same rule twice within cooldown; verify second trigger suppressed.
- /price command: with and without ticker arg; on feed success returns prices and 1h percent; on feed failure returns friendly error.
- Morning summary scheduling: enable at specific local time and receive summary with relevant sections.
- Admin analytics: /admin_stats returns totals and top-10 list to ADMIN_CHAT_ID and matches persisted counters.

## Assumptions

- Seed watchlist includes BTC, ETH, TON by default for new users.
- Percent-move default sliding window is 1 hour; UI offers choices up to 24 hours.
- Default cooldown is 60 minutes per user+coin+rule; user may override per-rule or in settings.
- Morning summary is off by default; user explicitly enables and chooses local time.
- Ticker validation is exchange-agnostic (symbols like BTC, ETH, TON); if multiple markets match, user is asked to disambiguate.
- Alert triggers during quiet hours are queued and delivered after quiet hours end with original trigger times.
- Owner receives weekly aggregated stats and can request on-demand reports via /admin_stats; the ADMIN_CHAT_ID env var points to owner/admin Telegram chat.
