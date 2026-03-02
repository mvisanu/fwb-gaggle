# FWB Gaggle — Stableford Handicap Tracker

A mobile-first, offline-capable web app for tracking weekly Stableford golf rounds, custom rolling handicaps, wins, skins, and greeny winnings for the FWB Gaggle group (~16 players).

**Live app:** https://mvisanu.github.io/fwb-gaggle/

**No install required.** Open in any browser — phone or desktop.

---

## Getting Started

1. Visit https://mvisanu.github.io/fwb-gaggle/ (or open `index.html` locally)
2. All 16 default players are pre-loaded with their starting handicaps
3. Tap **Enter Round** to start recording scores
4. Want to preview charts with demo data? Go to **Settings → Load Sample Data**

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
| **Leaderboard** | All active players sorted by handicap (lowest = best). Tap any column header to re-sort. Gold row = player with most wins |
| **Wins** | Gold horizontal bar chart — one bar per player, length = total wins |
| **Winnings** | Colour-coded pie chart showing each player's share of total skins + greeny dollars |
| **Win Leaderboard** | Ranked by wins with win percentage |
| **Form Guide** | Last 10 rounds as coloured dots — green = handicap dropped, red = went up, grey = no change |

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

## Round History

- Tap **History** to see all rounds, newest first
- Tap a round card to expand it and see every player's score, net, and handicap change
- Rounds with skins or greeny winnings show those columns automatically
- **Delete a round** — all subsequent handicaps, win counts, and winnings are fully recalculated from scratch

---

## Managing Players

Tap **Players** to:
- **Add** a new player with a starting handicap
- **Edit** a player's name or manually adjust their current handicap
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
| **Security** | Set a 4-digit PIN to protect data entry. Ask once per session — entering the PIN unlocks all protected actions until page refresh. Protected: Enter Round, Save Round, Players, Belt Champion ✎, Delete Round, Import/Clear/Reset/Load Sample Data. |
| **Export Data** | Downloads a full backup as `fwb-gaggle-backup-YYYY-MM-DD.json` |
| **Import Data** | Restores from a previously exported JSON file (PIN protected) |
| **Clear Round Data** | Wipes all rounds and resets player stats to starting handicaps (PIN protected) |
| **Load Sample Data** | Loads 6 demo rounds so you can preview all charts (PIN protected) |
| **Reset All Data** | Wipes everything and restores the 16 default players (double-confirmed, PIN protected) |

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
| Todd | 20 | Ute | 17 |
| Timmy | 15 | Haj | 22 |
| Tony | 14 | Mikie | 22 |
| Rich | 15 | Josh | 14 |

---

## Technical Notes

- **Single file** — everything is in `index.html` (HTML, CSS, JS). No server, no build tools.
- **Storage** — IndexedDB (primary) with localStorage fallback. Data persists across browser sessions.
- **Belt champion** — stored in `localStorage` key `beltHolder`. Defaults to `"Josh"`.
- **Data versioning** — a `DATA_VERSION` constant triggers a one-time clean reset when bumped on deploy.
- **Offline** — fully functional without internet after first load. Only Google Fonts requires a connection (degrades gracefully).
- **Mobile** — designed for 375px phone screens. All tap targets are 44px minimum. Light gray input boxes, white screens throughout.
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
Go to **Settings → Export Data**. A JSON file downloads to your device. To restore, use **Settings → Import Data** and select that file.

**Q: Can I use the app on multiple phones?**
Data is stored locally on each device (IndexedDB). To share data between devices, export from one and import on the other. There is no cloud sync.

**Q: How do I add a new player mid-season?**
Go to **Players → + Add Player**, enter their name and a starting handicap. They'll appear in the score entry list from the next round onward.

**Q: How do I adjust a player's handicap manually?**
Go to **Players**, tap the ✎ edit icon next to the player, and change their current handicap. Note: this only affects their current handicap — past round history is unchanged.

**Q: What does the Form Guide show?**
Each dot represents one of the player's last 10 rounds. Green = handicap dropped (played well), Red = handicap went up, Grey = no change.

**Q: The app looks different after an update — where did my data go?**
Occasionally a deploy bumps the internal data version to reset the app to a clean state. Export your data regularly via Settings → Export Data as a backup before updates.
