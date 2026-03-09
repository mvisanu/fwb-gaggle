# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FWB Gaggle — Stableford Handicap Tracker:** A mobile-first, offline-capable single-page web app for a golf group (~16 players). Tracks weekly Stableford rounds, custom rolling handicaps, wins, skins/greeny winnings, and trends. Hosted on GitHub Pages at https://mvisanu.github.io/fwb-gaggle/

## Architecture

- **Single file:** Everything lives in `index.html` — HTML, CSS, and JS inline. No frameworks, no build tools, no bundler.
- **Storage:** Firebase Firestore (real-time sync, primary) → IndexedDB fallback → localStorage fallback. Controlled by `FIREBASE_CONFIG` constant at top of `<script>`: set to a config object to enable Firestore, `null` to use local IndexedDB only.
- **Firestore SDK:** Firebase compat SDK v9.23.0 loaded via CDN in `<head>` (`firebase-app-compat.js` + `firebase-firestore-compat.js`). Uses compat API (not ES modules) to work with the existing non-module script.
- **Offline:** Firestore offline persistence enabled via `enablePersistence({ synchronizeTabs: true })`. Fully functional without internet — changes queue and sync on reconnect. Google Fonts degrades gracefully.
- **No build/test/lint commands.** Open `index.html` directly in a browser to run (or serve via GitHub Pages for Firestore to work fully).

## Handicap Calculation (Critical Business Logic)

Custom society handicap where the handicap value equals expected Stableford points.

- **Up (actual > hdcp):** `newHdcp = currentHdcp + Math.floor((actual - currentHdcp) / 2)` — no cap
- **Down (actual < hdcp):** `reduction = Math.floor((currentHdcp - actual) / 2)`, `newHdcp = currentHdcp - Math.min(reduction, 2)` — capped at -2 per round
- **Same:** no change
- **Hard floor:** `MIN_HDCP = 14` — handicap can never drop below 14, enforced via `Math.max(MIN_HDCP, newHdcp)` in `calcHandicap()`

Net score = `actual - hdcpBefore` (negative is good). Round winner = lowest net score; ties broken by lower handicap.

### Verification table — all must pass:
| Hdcp | Actual | New Hdcp | Reason |
|------|--------|----------|--------|
| 22 | 29 | 25 | +floor(7/2)=3 |
| 22 | 18 | 20 | -min(floor(4/2),2)=2 |
| 15 | 16 | 15 | +floor(1/2)=0 |
| 18 | 17 | 18 | -floor(1/2)=0 |
| 15 | 12 | 14 | -min(floor(3/2),2)=1 |
| 24 | 27 | 25 | +floor(3/2)=1 |
| 20 | 10 | 18 | -min(floor(10/2),2)=2 (capped) |
| 14 | 14 | 14 | no change |

## Data Schema

```json
{
  "players": [
    { "id": "uuid", "name": "Visanu", "startingHdcp": 24, "currentHdcp": 24, "active": true, "wins": 0, "beltWins": 0, "skinsWinnings": 0, "greenyWinnings": 0, "payoutWinnings": 0 }
  ],
  "rounds": [
    {
      "id": "uuid",
      "date": "2026-03-01",
      "scores": [
        { "playerId": "uuid", "playerName": "Visanu", "hdcpBefore": 24, "actual": 22, "hdcpAfter": 23, "netScore": -2, "skinsWon": 0, "greenyWon": 0, "payoutWon": 0 }
      ],
      "winnerId": "uuid",
      "winnerName": "Visanu"
    },
    {
      "id": "uuid",
      "date": "2026-03-07",
      "winningsOnly": true,
      "scores": [
        { "playerId": "uuid", "playerName": "Julius", "actual": 29, "skinsWon": 0, "greenyWon": 0, "payoutWon": 10 }
      ],
      "winnerId": "uuid",
      "winnerName": "Julius"
    }
  ]
}
```

**winningsOnly rounds** (`winningsOnly: true`): recorded via Update Winnings screen. Handicaps are NOT recalculated. `fullRecalculate()` fast-path accumulates `payoutWinnings`, `skinsWinnings`, `greenyWinnings` and increments `wins` for the winner. Winner determined by `_winningsWinner()` (highest `payoutWon`, fallback highest `actual`). Stored `winnerId` may be stale — always recompute via `_winningsWinner(r.scores)` at display time.

localStorage keys (outside IndexedDB — used in local mode only unless noted):
- `beltHolder` / `<group>-beltHolder` — belt champion (local mode). In Firestore mode: `_fsSettings.beltHolder`
- `dataVersion` / `<group>-dataVersion` — one-time migration key (local mode only; never checked in Firestore mode)
- `autoBackup` / `<group>-autoBackup` — silent backup JSON written after every round save (both modes)
- `editorPin` / `<group>-editorPin` — Editor PIN (local mode). In Firestore mode: `_fsSettings.editorPin`
- `knownGroups` — shared JSON array of all registered group keys (used by admin view, both modes)
- `groupLabel-<key>` — human-readable label for a group key (both modes)
- `adminPin` — shared global Admin PIN (both modes)
- `zoomSize` — shared device-level zoom preference (both modes)
- `<group>-fsMigrated` — set after Migrate local data → Firestore completes, hides migration button

Firestore document paths (Firestore mode):
- `groups/{GROUP}/players/{playerId}` — player documents (id excluded from doc, used as doc key)
- `groups/{GROUP}/rounds/{roundId}` — round documents
- `groups/{GROUP}/meta/settings` — `{ beltHolder, editorPin, skinsRate, greenyRate, competitionBuyin }`

## Round Deletion & Recalculation

Deleting a round requires full recalculation: reset all players to `startingHdcp`, `wins=0`, `skinsWinnings=0`, `greenyWinnings=0`, `payoutWinnings=0`, replay every remaining round chronologically, recompute all handicaps, win counts, and winnings from scratch. `updateBeltHolderFromRounds()` is also called to sync the belt holder from Monday rounds.

**`_winningsWinner(scores)`** — determines winner for winningsOnly rounds: highest `payoutWon` first; fallback to highest `actual` when no payouts entered. Returns `{ winnerId, winnerName }`.

**Leaderboard win counts** are computed live in `renderDashboard()` by iterating all rounds (using `_winningsWinner` for winningsOnly rounds) — never read from stored `p.wins` for the display. This avoids stale Firestore data issues.

**Leaderboard belt column** shows `Math.max(p.beltWins, beltCountById[p.id])` where `beltCountById` is computed live from Monday rounds. `p.beltWins` is a manually editable field (via Edit Player modal) for historical corrections. Future Monday round wins auto-increment via the computed count.

**Firestore batch limit** — `fullRecalculate()` chunks all player+round writes into batches of 500 ops (Firestore hard limit). winningsOnly rounds excluded from batch (not mutated), except when `winnerId` changed (patched individually).

## App Screens

The header is sticky and split into two tiers:
1. **Green tier** — back button, screen title ("FWB Gaggle" on dashboard)
2. **White tier** — Championship belt bar: WBC-style belt SVG icons flanking "Champion: [Name]". Tap the ✎ pencil to open a player selector modal and change the champion.

The dashboard is a single scrolling page (no tabs). All sections stack vertically.

1. **Dashboard** — Stats banner (Rounds / Last Round / Top Winner) → Leaderboard (columns: #, Player, Hdcp, Wins 🏆, Belt 🥊, Last, +/-) → Wins bar chart → Winnings pie chart → Win Leaderboard → Form Guide → Nav buttons
2. **Enter Round** — White content panel. Date picker, score inputs (live handicap preview), Skins $ and Greeny $ per player, auto-determines winner on save. Only players with a score entered are updated — absent players keep their current handicap.
3. **Round History** — Expandable round cards (newest first), delete with full recalculation. Skins/Greeny columns appear automatically if round has winnings data. winningsOnly cards show winner row gold, rows sorted by payoutWon desc.
4. **Player History** — (`screenPlayerHistory`, `renderPlayerHistory()`, `_renderPlayerHistoryContent()`). State: `_playerHistoryId` (null = list view, non-null = detail for that player).
   - **List view**: active players with ≥1 round; sorted total winnings desc → currentHdcp desc → wins desc → name. Each card shows `Hdcp N · N wins` + last 3 rounds via `_phRow()`. Tap → detail.
   - **Detail view**: all rounds newest first; full table with Skins/Greeny columns. Trophy via `_winningsWinner(r.scores)` computed on-the-fly (not from stored `winnerId`).
   - `_phRow(r, playerId, showWinnings)` — shared row renderer. winningsOnly rows recompute winner via `_winningsWinner` to avoid stale stored `winnerId`.
5. **Update Winnings** — (`screenUpdateWinnings`, `renderWinningsEntry()`, `onWinningsDateChange()`, `saveWinningsEntry()`). PIN protected. Records non-Monday results without updating handicap.
   - Date picker → detects existing regular round / existing winningsOnly round / new entry
   - Inputs: Pts (optional), $ Stableford, $ Skins, $ Greeny per player
   - Saves as `winningsOnly: true` round. Winner = `_winningsWinner()` (highest payoutWon, fallback highest actual)
   - Does NOT modify handicaps regardless of day
6. **Manage Players** — Add/edit/toggle active/delete players. Sub-line shows skins and greeny totals if non-zero. Edit Player modal includes: Name, Starting Handicap, Current Handicap, Belt Wins (manual override for leaderboard belt column)
7. **Settings** — Handicap reference table, payout calculator (configurable buy-in + 1/2/3 places; default 2 places 60/40%), skins calculator (per-hole rates or fixed pot), greeny calculator (closest-to-pin par 3s), security (4-digit PIN), export/import JSON, Clear Round Data, Load Sample Data, Reset All Data, Migrate local data → Firestore (visible only in Firestore mode before migration)
8. **Help & FAQ** — Quick Start guide, 10 expandable FAQ items (tap to open/close), handicap rules summary. Accessible via full-width button at bottom of dashboard nav grid.

## Belt Holder / Monday Champion

- Stored in `_fsSettings.beltHolder` (Firestore mode) or `localStorage.getItem('beltHolder')` (local mode), default `"Josh"`
- **Auto-update:** when a round is saved on a Monday, the winner becomes the new belt holder
- **Manual update:** tap the ✎ icon in the belt bar → player picker modal (light gray background) → select champion → live update
- `updateBeltHolderFromRounds(rounds)` scans Monday rounds (most recent first) and sets the belt holder — called in `fullRecalculate()`
- `renderBeltHolder()` called after every round save (any day) to keep the display in sync

## Skins & Greeny Tracking

- Per round, per player: `skinsWon` (dollars) and `greenyWon` (dollars) entered on the Enter Round screen
- Player totals: `skinsWinnings` and `greenyWinnings` accumulate across rounds
- `fullRecalculate()` resets these to 0 and re-accumulates from round data
- Dashboard shows: **Wins bar chart** (CSS flexbox, gold gradient bars) and **Winnings pie chart** (SVG, colour-coded slices with legend)

## Skins Calculator (Settings tool — does not write to DB)

A standalone calculator in Settings for working out hole-by-hole skins payouts before recording the total in Enter Round.

**Per-hole rates mode (FWB Gaggle default):**
- Skin (sole best score): winner collects $1 from each other player. Rate configurable.
- Birdie (sole, par−1): winner collects $2 from each other player. Rate configurable.
- Eagle (sole, ≤ par−2): winner collects $5 from each other player. Rate configurable.
- Birdie tie (2+ players tied at par−1): each birdie player collects $1 consolation from each non-birdie player (zero-sum).
- Other tie: push — skin lost (or carries to next hole if carry-over enabled).

**Fixed pot mode:**
- $ per player × N players = total pot. Pot ÷ holes = value per hole.
- Lowest score wins the hole's value. Ties push (carry-over optional).
- No birdie/eagle multipliers in fixed pot mode.

Key functions: `renderSkinsPlayers()`, `buildSkinsTable()`, `calcSkins()`, `skinsToggleMode()`, `skinsPotUpdate()`.

## Sample Data

- **Not auto-loaded** on first launch. App starts clean with default players and no rounds.
- Available via Settings → **Load Sample Data** (6 rounds, Jan–Feb 2026, with skins/greeny amounts)
- Settings buttons: **Clear Round Data** (wipes rounds, resets player stats to `startingHdcp`) and **Reset All Data** (full wipe, reseeds 16 default players)

## Multi-Group Support

Each group is isolated by the `?group=<key>` URL parameter. The key is a 16-character random hex string (64-bit) — the URL itself is the access control. Share the link = share view access.

- `GROUP` constant read from `new URLSearchParams(window.location.search).get('group') || 'monday'`
- `GROUP_LABEL` = `localStorage.getItem('groupLabel-' + GROUP)` with fallback to capitalised group name + " Gaggle"
- `DB_NAME`: `'fwbGaggle'` for monday (backward compat), `'fwbGaggle-<group>'` for all others (IDB mode only)
- `lsKey(name)` helper: returns `name` for monday, `'<group>-name'` for others
- All group-specific localStorage keys go through `lsKey()`: `beltHolder`, `dataVersion`, `autoBackup`, `editorPin`
- Shared (no prefix): `adminPin`, `zoomSize`, `knownGroups`, `groupLabel-<key>`
- `registerGroup()` called in `init()` — adds group key to `knownGroups` array in localStorage
- **Default players:** `monday` group seeds the 16 named players. All other groups seed `Player 1` – `Player 16` (starting hdcp 18).
- **Admin view**: `?admin=1` in URL — initialises Firebase (if configured) then shows `screenAdmin`
  - `renderAdmin()` reads player/round counts from Firestore (Firestore mode) or opens each group's IndexedDB (local mode)
  - Labels looked up from `groupLabel-<key>` in localStorage
  - Tap any group card → navigates to `?group=<key>`
  - **Create New Group** button → `adminCreateGroup()` → prompts for a name, calls `generateGroupKey()` (8 random bytes → 16-char hex), stores label, navigates to new group URL

## Data Versioning

`DATA_VERSION = 'v2-clean'` in `init()`. On first load after a deploy that bumps this value (local mode only):
1. Clears all IndexedDB data (`clearAll()`)
2. Sets `beltHolder` to `"Josh"` in localStorage
3. Stores the new version key so the reset only fires once
4. Seeds default players and renders a clean dashboard

**Firestore mode is exempt** — the `DATA_VERSION` check is guarded by `if (!firestoreDB)` to prevent wiping shared cloud data for all users.

To trigger a one-time reset on next deploy (local mode), bump `DATA_VERSION` to a new string.

## Design Tokens

- Dark green theme: primary `#1a472a`, deep `#0d2818`
- Gold accent: `#d4af37`, gold-dark: `#b8960c`, cream: `#f5f0e1`
- Handicap down (good): `#4ade80` / `#16a34a` (on light), handicap up (bad): `#e8443a` / `#dc2626`
- **White body background:** `--white: #ffffff` — all screens, inputs, history cards use white/light-gray
- Input background: `--row-stripe: #f1f5f9` (light gray for all input boxes)
- Text: `--text-dark: #1e293b`, muted: `--text-muted: #64748b` (WCAG AA on white)
- 44px minimum tap targets, 18px+ input font size, body `line-height: 1.5`
- Native pinch-zoom enabled (no `user-scalable=no`)
- Google Fonts: Bebas Neue (headings), Barlow (body)
- Screen transitions: fade ~300ms

## Zoom Widget

Floating pill fixed bottom-right (`z-index: 9999`). Fades to 25% opacity at rest, full opacity on hover/focus. Font size range 12–24px in 2px steps, persisted via `localStorage` key `zoomSize`. Keyboard: Ctrl+= zoom in, Ctrl+− zoom out, Ctrl+0 reset. Implemented as inline HTML+`<script>` block after `</script>` (main app), before `</body>`.

## Greeny Calculator (Settings tool — does not write to DB)

Closest-to-pin on par 3 holes. Configurable $ per greeny (default $1) and number of par 3 holes (default 3).

- Select players → Build Greeny Card → one winner dropdown per par 3 → Calculate Greeny
- Winner collects `$ per greeny × (N−1)` from other players (zero-sum net winnings)
- Key functions: `renderGreenyPlayers()`, `buildGreenyCard()`, `calcGreeny()`

## PIN System

Two PIN layers per group. No viewer/access PIN prompt — the URL itself controls who can view.

### Editor PIN
Per-group 4-digit PIN stored via `lsKey('editorPin')`. Default `"2026"` set on first load if absent. Once correct PIN is entered in a session, `sessionUnlocked = true` and all subsequent `requirePin()` calls bypass the modal until page refresh.

**Protected actions** (all wrapped with `requirePin(() => action())`):
- Nav buttons: Enter Round, Players
- Enter Round: Save Round button (defence-in-depth)
- Header: Belt Champion ✎ edit button (visible from all screens)
- History: Delete Round (`confirmDeleteRound` → `requirePin` → `_confirmDeleteRound`)
- Settings: Import Data, Clear Round Data, Load Sample Data, Reset All Data

**Not protected:** Export Data, History (view), Settings calculators, Help & FAQ

**Key functions:** `requirePin(cb)`, `_showPinPad(title, onComplete)`, `pinKey(key)`, `_updatePinDots()`, `setupPin()`, `changePin()`, `confirmRemovePin()`, `removePin()`, `renderPinSection()`

**Storage:** `lsKey('editorPin')` in local mode; `_fsSettings.editorPin` (Firestore `meta/settings` doc) in Firestore mode. Default `"2026"` written on first load (local) or first settings doc creation (Firestore).

### Admin PIN
Global (not namespaced) PIN stored in `localStorage` key `adminPin`. Bypasses Editor PIN on any group — accepted by both `requirePin()` and `changePin()`/`confirmRemovePin()`. Managed from the `?admin=1` admin view.

**Key functions:** `getAdminPin()`, `setAdminPin()`, `removeAdminPin()`, `renderAdminPinSection()`, `setupAdminPin()`, `changeAdminPin()`, `confirmRemoveAdminPin()`

## Key Technical Constraints

- IDs via `crypto.randomUUID()` with fallback
- `inputmode="numeric"` on score inputs, `inputmode="decimal"` on money inputs
- Prevent double-submit on Save Round (`savingRound` flag)
- All data export as `fwb-gaggle-backup-YYYY-MM-DD.json`
- White screens with light-gray inputs; `.content-panel` overrides kept for backward compat but base styles now handle light theme
- Belt bar is outside `.app-header-inner` — it is a sibling div inside `<header>` with white background and gold top border

## Default Players (preloaded on first launch)

**`monday` group:** Visanu 24, Biscuit 18, Julius 22, PK 15, Todd 20, Timmy 15, Tony 14, Rich 15, Josh 14, Jordan 18, Chuck 24, Steve 14, Ben 14, Yut 17, Haj 22, Mikey 22

**All other groups:** Player 1 – Player 16, starting handicap 18 each.

## QA Checklist (verify before finishing)

1. All 8 handicap examples from the verification table produce correct results
2. Entering a round with some blanks only saves players with scores; absent players keep their handicap
3. Round winner is correctly identified (lowest net score, tiebreak = lower handicap)
4. Win counts and skins/greeny accumulate correctly across multiple rounds
5. Deleting a middle round recalculates all later handicaps, win counts, AND winnings correctly
6. Progress/trend display accurately reflects handicap history
7. Export produces valid downloadable JSON; import restores full app state including wins and winnings
8. Reset clears everything, reloads default 16 players with 0 wins/winnings
9. Number inputs show numeric keyboard on mobile
10. Leaderboard sorts correctly (lowest handicap = rank 1)
11. Player with most wins is visually highlighted on dashboard; "Top Winner" stat shows most-wins player
12. App starts clean (no sample data); sample data available via Settings → Load Sample Data
13. Belt holder displays correctly in white header bar; ✎ icon opens champion selector (light gray modal)
14. Saving a Monday round auto-updates the belt holder to the round winner
15. `DATA_VERSION` bump triggers one-time clean reset on next page load
16. Handicap never drops below 14 regardless of score (MIN_HDCP floor enforced in calcHandicap)
17. Help & FAQ screen accessible from dashboard; FAQ items expand/collapse on tap
18. Skins Calculator in Settings: per-hole rates mode calculates zero-sum net winnings; fixed pot mode divides pot across won holes
19. Payout calculator defaults to 2 places (60/40%); configurable buy-in and 1/2/3 places
20. Greeny Calculator: select players, pick par 3 winners, shows zero-sum net winnings
21. Editor PIN: default 2026 on first load; ask once per session; all protected actions unlock after correct entry; Admin PIN also accepted
22. New group creation from admin: generates 16-char hex key, prompts for name, stores label, navigates to new group URL
23. Firestore mode: set FIREBASE_CONFIG → players/rounds/settings sync in real-time across all devices; onSnapshot listeners update UI without page refresh
24. Firestore mode: fullRecalculate() uses a single batch.commit() for all player+round writes; _suppressRender prevents listener storms mid-batch
25. Firestore mode: DATA_VERSION reset skipped (guard: if (!firestoreDB)); settings defaults written to Firestore on first settings doc creation
26. Local mode: FIREBASE_CONFIG = null → app behaves exactly as before (IndexedDB / localStorage, no Firestore calls)
27. Non-monday groups seed Player 1–16 (hdcp 18) instead of the named Monday players
28. Player History list view: only players with ≥1 round shown; sorted total winnings → hdcp → wins → name; shows Hdcp + wins count per card
29. Player History detail view: all rounds for player, trophy on winning rows (computed live, not from stored winnerId)
30. Update Winnings: saves winningsOnly round; does not change handicaps; winner shown in History and Player History with trophy
31. Leaderboard Wins column counts wins from all round types including winningsOnly (computed live from rounds in renderDashboard)
32. Leaderboard Belt column shows champion.png icon + count; value = max(p.beltWins manual field, computed Monday-round wins); editable via Manage Players → Edit Player → Belt Wins field
33. Firestore sync: round + all player writes batched atomically; onSnapshot events debounced 50ms so phone/computer always render consistent state after a save
