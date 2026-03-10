# FWB Gaggle — Stableford Handicap Tracker

A mobile-first, offline-capable web app for tracking weekly Stableford golf rounds, custom rolling handicaps, wins, skins, and greeny winnings. Supports multiple independent groups from a single deployment.

**Live app:** https://mvisanu.github.io/fwb-gaggle/

**No install required.** Open in any browser — phone or desktop.

---

## Getting Started

1. Visit your group's URL (e.g. `https://mvisanu.github.io/fwb-gaggle/?group=a3f8b2c9d4e6f1a2`) — get this from the admin who created the group
2. All 16 default players are pre-loaded with their starting handicaps
3. Tap **Enter Round** to start recording scores
4. Want to preview charts with demo data? Go to **Settings → Load Sample Data**

---

## Multiple Groups

Each group gets its own fully isolated data. Groups are identified by a random 64-bit key in the URL — **the URL is the access control**. Anyone with the link can view; the Editor PIN is required to make changes.

| URL | Description |
|---|---|
| `...?group=a3f8b2c9d4e6f1a2` | A group with a random key |
| `...?group=monday` | Legacy Monday group (backward compatible) |
| `...?admin=1` | **Admin view** — see all groups, create new ones |

- Each group's data (players, rounds, handicaps, winnings) is completely separate
- Groups cannot see each other's data
- Every group self-registers on first load — they appear automatically in the admin view
- The default URL with no `?group=` param uses `monday` data (backward compatible)

**Admin view** (`?admin=1`) shows all registered groups with player count, round count, and last round date. Tap any group card to open it. Use **+ Create New Group** to generate a new random-key group — enter the group's name, and the app creates the URL and navigates to it automatically.

---

## Header — Championship Belt

The sticky header has two tiers:

| Tier | Background | Content |
|---|---|---|
| **Top** | Dark green | Screen title (FWB Gaggle / Enter Round / etc.) |
| **Bottom** | White | `[belt] Champion: JOSH [belt]` |

- The Monday belt champion is displayed between two WBC-style championship belt icons
- Tap the **✎** pencil icon to open a player picker (light gray modal) and change the champion manually
- When a **Monday round** is saved, the winner automatically becomes the new belt champion

---

## Dashboard

The home screen scrolls through all sections:

| Section | What it shows |
|---|---|
| **Stats Banner** | Total rounds played · Date of last round · Player with most wins |
| **Leaderboard** | All active players sorted by handicap (lowest = best). Tap any column header to re-sort. **Wins** 🏆 counts all round wins (including winningsOnly rounds). **Belt** 🥋 counts Monday round wins (championship belt holders). Gold row = player with most wins |
| **Wins** | Gold horizontal bar chart — one bar per player, length = total wins |
| **Winnings** | Colour-coded pie chart showing each player's share of total skins + greeny dollars |
| **Win Leaderboard** | Ranked by wins with win percentage |
| **Form Guide** | Last 10 rounds as arrows — green ↑ = handicap dropped (played well), red ↓ = went up, grey − = no change |
| **Top 5 Sandbaggers** | Ranks players by average net score (actual − handicap). Honest players average ~0; sandbaggers are consistently positive. Shows Avg Net, Beat% (rounds above handicap), and Best single round. Min 3 rounds required. #1 spot highlighted in red. |

---

## Entering a Round

1. Tap **Enter Round** from the dashboard
2. Select the date (defaults to today)
3. For each player who played, enter their total **Stableford points**
   - A live preview shows their new handicap and net score as you type
   - Players left blank are skipped — their handicap stays unchanged
4. Optionally enter **Skins $** and/or **Greeny $** for any player who won money
5. Tap **Save Round**
   - The winner (lowest net score) is auto-determined
   - Handicaps update immediately for players who played
   - If the round date is a **Monday**, the winner becomes the new belt champion
   - The dashboard refreshes automatically

---

## Handicap Rules

This is a custom society handicap — the handicap value represents expected Stableford points.

| Situation | Formula |
|---|---|
| Scored **above** handicap | `newHdcp = hdcp + floor((actual − hdcp) / 2)` — no cap |
| Scored **below** handicap | `reduction = floor((hdcp − actual) / 2)`, capped at −2 per round |
| Scored **equal** to handicap | No change |
| **Hard floor** | Handicap can never drop below **14** |

**Net score** = `actual − handicap before round` (negative is good — you beat your handicap)

**Round winner** = player with the lowest net score. Ties go to the lower handicap.

---

## Player History

Tap **📈 Player History** from the dashboard to see a per-player view of all rounds.

- **List view** — all active players who have at least one round, ordered by total winnings → highest handicap → most wins → name. Each card shows the player's current handicap, win count, and their last 3 rounds in a compact table
- **Detail view** — tap any player card to see every round they've played, newest first. Shows points, net score, handicap change, and skins/greeny winnings columns when present
- Trophy 🏆 icon appears next to the date on rounds where that player won (including winningsOnly rounds)

---

## Update Winnings

Tap **💵 Update Winnings** (PIN protected) to record a non-Monday result without changing handicaps.

- Select the date — the app detects whether a regular round, a winningsOnly entry, or a new entry exists for that date
- Enter each player's **Pts** (optional), **$ Stableford**, **$ Skins**, and **$ Greeny** amounts
- Winnings accumulate to player totals and appear in the leaderboard and win counts
- The player with the highest $ Stableford payout is the winner; falls back to highest Pts if no dollar amounts are entered
- Does **not** modify handicaps regardless of the day

---

## Round History

- Tap **History** to see all rounds, newest first
- Tap a round card to expand it and see every player's score, net, and handicap change
- Rounds with skins or greeny winnings show those columns automatically
- winningsOnly rounds show winner highlighted in gold, sorted by payout
- **Delete a round** — all subsequent handicaps, win counts, and winnings are fully recalculated from scratch

---

## Managing Players

Tap **Players** to:
- **Add** a new player with a starting handicap
- **Edit** a player's name, manually adjust their current handicap, or set their **Belt Wins** count (used in the leaderboard belt column — useful for crediting historical Monday wins not yet recorded as rounds)
- **Toggle active/inactive** — inactive players are hidden from score entry but their history is kept
- **Delete** a player — their past scores remain in round history as archived data

---

## Settings

| Option | Description |
|---|---|
| **Handicap Reference** | Table mapping handicap → expected Stableford points |
| **Payout Calculator** | Configurable players, buy-in amount, and places paid (1st only / 1st & 2nd / 1st–3rd). Defaults to 2 places at 60/40% split. |
| **Skins Calculator** | Hole-by-hole skins calculator. Two modes: **Per-hole rates** (skin $1, birdie $2, eagle $5 from each player; birdie-tie consolation $1 each) or **Fixed pot** (fixed buy-in split across holes won). Carry-over toggle (default off). |
| **Greeny Calculator** | Closest-to-pin on par 3s. Configurable $ per greeny (default $1). Select players, pick winner per par 3, shows net winnings. |
| **Security** | **Editor PIN** — 4-digit PIN protecting all data entry actions (default: `2026`). Per-group. Ask once per session — entering it unlocks all protected actions until page refresh. Protected: Enter Round, Save Round, Players, Belt Champion ✎, Delete Round, Import/Clear/Reset/Load Sample Data. The global **Admin PIN** (set in the admin view) also accepts in place of the Editor PIN. |
| **Export Data** | Downloads a full backup as `fwb-gaggle-backup-YYYY-MM-DD.json`. Also triggers automatically after every round save. |
| **Import Data** | Restores from a previously exported JSON file (PIN protected) |
| **Clear Round Data** | Wipes all rounds and resets player stats to starting handicaps (PIN protected) |
| **Load Sample Data** | Loads 6 demo rounds so you can preview all charts (PIN protected) |
| **Reset All Data** | Wipes everything and restores the 16 default players (double-confirmed, PIN protected) |
| **Migrate local data → Firestore** | Copies existing local IndexedDB data to Firestore (visible only when Firestore is configured and migration hasn't run). PIN protected. |

---

## Help & FAQ (In-App)

Tap the **❓ Help & FAQ** button at the bottom of the dashboard to open the in-app help screen, which includes:
- **Quick Start** — 3-step guide to entering rounds, setting the belt champion, and backing up data
- **10 expandable FAQ items** — tap any question to reveal the answer
- **Handicap rules summary** — formula reference at a glance

---

## Default Players

| Player | Starting Hdcp | Player | Starting Hdcp |
|---|---|---|---|
| Visanu | 24 | Jordan | 18 |
| Biscuit | 18 | Chuck | 24 |
| Julius | 22 | Steve | 14 |
| PK | 15 | Ben | 14 |
| Todd | 20 | Yut | 17 |
| Timmy | 15 | Haj | 22 |
| Tony | 14 | Mikey | 22 |
| Rich | 15 | Josh | 14 |

---

## Technical Notes

- **Single file** — everything is in `index.html` (HTML, CSS, JS). No server, no build tools.
- **Storage** — Firebase Firestore (primary, real-time sync across all devices) with IndexedDB local fallback. Set `FIREBASE_CONFIG = null` in the script to revert to fully local IndexedDB mode.
- **Real-time sync** — all players, rounds, belt holder, PIN, and settings are stored in Firestore under `groups/{GROUP}/`. Changes on one device appear instantly on all others via `onSnapshot` listeners. Round saves batch all player + round writes atomically; snapshot events are debounced 50ms so all devices always render a consistent state.
- **Offline** — Firestore offline persistence is enabled (`enablePersistence({ synchronizeTabs: true })`). Rounds saved offline are queued and synced automatically when connectivity returns.
- **Multi-group** — `?group=<key>` in URL isolates all data per group. Key is a 16-char random hex string — the URL itself controls view access. Create groups via admin view (`?admin=1`). Monday uses original key names for backward compatibility.
- **Belt champion** — stored in Firestore `meta/settings.beltHolder` (Firestore mode) or `localStorage` key `beltHolder` (local mode). Defaults to `"Josh"`.
- **Data versioning** — a `DATA_VERSION` constant triggers a one-time clean reset when bumped on deploy. Guarded to only run in local mode — never wipes Firestore data.
- **Migration** — existing local data can be copied to Firestore via **Settings → Migrate local data → Firestore** (visible only when Firestore is configured and migration hasn't run yet).
- **Mobile** — designed for 375px phone screens. All tap targets are 44px minimum. Light gray input boxes, white screens throughout. Native pinch-zoom enabled.
- **Zoom widget** — floating A−/100%/A+ pill (bottom-right, fades until hovered). Font size 12–24px in 2px steps. Keyboard: Ctrl+= / Ctrl+− / Ctrl+0. Persists via `localStorage` key `zoomSize`.
- **Accessibility** — WCAG AA contrast on all text. Body line-height 1.5.
- **Deployed** — GitHub Pages at https://mvisanu.github.io/fwb-gaggle/ (auto-deploys on push to `master`)

---

## FAQ

**Q: What if a player doesn't show up that day?**
Leave their score blank. Only players with a score entered are updated — everyone else keeps their current handicap unchanged.

**Q: How is the round winner decided?**
The player with the lowest net score wins. Net score = Stableford points − handicap before the round (negative means you beat your handicap). If two players tie on net score, the lower handicap wins.

**Q: How do I change who the belt champion is?**
Tap the small ✎ pencil icon next to the champion name in the white belt bar at the top. A list of active players appears — tap any name to set them as champion instantly. It also updates automatically when a Monday round is saved.

**Q: What if I enter the wrong score for a round?**
Go to **History**, expand the round card, and tap **Delete Round**. Then re-enter the round with the correct scores. Deleting a round fully recalculates all handicaps, wins, and winnings from scratch.

**Q: How do skins work in the FWB Gaggle?**
Skins are played hole by hole on stroke scores. Sole best score wins the hole: regular skin = $1 from each other player, birdie = $2 from each, eagle = $5 from each. Ties mean no winner (no carry-over by default). Birdie tie exception: each birdie player collects $1 consolation from every non-birdie player. Use the **Skins Calculator** in Settings to calculate payouts automatically, then record each player's total in the Skins $ field when entering the round.

**Q: Can two players share the greeny prize?**
Yes — enter the dollar amount for each player individually in their own Greeny $ field on the Enter Round screen.

**Q: How do I back up my data?**
A backup downloads automatically every time a round is saved — no action needed. You can also manually trigger one via **Settings → Export Data**. To restore from a backup, use **Settings → Import Data** and select the JSON file. If your device syncs Downloads to iCloud, Google Drive, or OneDrive, backups are effectively cloud-stored.

**Q: Can I use the app on multiple phones?**
Yes — all data syncs in real time via Firebase Firestore. Open the same group URL on any device and you'll see the same leaderboard, rounds, and handicaps. Changes made on one device appear instantly on all others.

**Q: How do I set up a second group?**
Go to the admin view at `?admin=1` and tap **+ Create New Group**. Enter the group's name (e.g. "Saturday") — the app generates a random URL key, creates the group, and navigates to it. Share that URL with the group members. The group starts fresh with default players and no rounds.

**Q: How do I view all groups as admin?**
Open `https://mvisanu.github.io/fwb-gaggle/?admin=1`. This shows all registered groups with their player count, round count, and last round date. Tap any group card to open it.

**Q: How do I add a new player mid-season?**
Go to **Players → + Add Player**, enter their name and a starting handicap. They'll appear in the score entry list from the next round onward.

**Q: How do I adjust a player's handicap manually?**
Go to **Players**, tap the ✎ edit icon next to the player, and change their current handicap. Note: this only affects their current handicap — past round history is unchanged.

**Q: What is the Belt column in the leaderboard?**
The belt icon column counts how many times each player has won the Monday championship belt. It automatically counts Monday-dated round wins. You can also set a player's belt win count manually via **Players → ✎ Edit → Belt Wins** — useful for crediting historical wins before the app was tracking them.

**Q: Why isn't a player's belt win showing in the leaderboard?**
Belt wins are counted from Monday-dated rounds stored in the app. If a win happened before the round was recorded in the app, go to **Players → ✎ Edit** and set the player's Belt Wins count manually.

**Q: How does the Sandbagger leaderboard work?**
It ranks the top 5 players by **average net score** (actual Stableford points minus handicap before the round) across all regular rounds. A correctly-handicapped player should average around 0 — consistently positive averages indicate sandbagging. The leaderboard also shows Beat% (how often they beat their handicap; ~20% is normal, >50% is suspicious) and their single best net round. Requires at least 3 rounds to appear.

**Q: What does the Form Guide show?**
Each arrow represents one of the player's last 10 rounds. Green ↑ = handicap dropped (played well), Red ↓ = handicap went up, Grey − = no change. Players who didn't play a given round are simply skipped.

**Q: The app looks different after an update — where did my data go?**
Occasionally a deploy bumps the internal data version to reset the app to a clean state. Export your data regularly via Settings → Export Data as a backup before updates.
