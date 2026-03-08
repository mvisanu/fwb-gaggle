# FWB Gaggle — Stableford Handicap Tracker

Build a mobile-first, offline-capable single-page web app in **one self-contained `index.html`** file (vanilla HTML/CSS/JS, no frameworks, no build tools). It must work when opened directly in a phone browser.

---

## What This App Does

Replaces an Excel spreadsheet for a golf group called "FWB Gaggle" (~15 players). They play weekly Stableford rounds and track a custom rolling handicap. The app lets you enter total Stableford points for each player after a round, auto-calculates handicap changes, tracks wins, and shows progress over time on a dashboard.

---

## Data Storage

Use **IndexedDB** (via a simple wrapper) as the primary database so data persists reliably across sessions even if localStorage gets cleared. Fall back to localStorage if IndexedDB is unavailable. Store all data in an IndexedDB database called `"fwbGaggle"` with object stores for `players` and `rounds`.

Data shape:
```json
{
  "players": [
    {
      "id": "uuid",
      "name": "Visanu",
      "startingHdcp": 24,
      "currentHdcp": 24,
      "active": true,
      "wins": 0
    }
  ],
  "rounds": [
    {
      "id": "uuid",
      "date": "2026-03-01",
      "scores": [
        {
          "playerId": "uuid",
          "playerName": "Visanu",
          "hdcpBefore": 24,
          "actual": 22,
          "hdcpAfter": 23,
          "netScore": -2
        }
      ],
      "winnerId": "uuid",
      "winnerName": "Visanu"
    }
  ]
}
```

The `netScore` for each player in a round = `actual - hdcpBefore` (negative means they played better than their handicap, which is good). The winner of each round is the player with the **lowest net score** (furthest below their handicap). Ties go to the player with the lower handicap before the round.

---

## Handicap Calculation Rules (CRITICAL — get this exactly right)

Custom society handicap. The "handicap" equals expected Stableford points. Higher points = worse (more strokes needed).

**Inputs:** `currentHdcp` (integer), `actual` (integer — total Stableford points scored)

**Going UP (actual > currentHdcp) — UNLIMITED:**
```
newHdcp = currentHdcp + Math.floor((actual - currentHdcp) / 2)
```
For every 2 points scored above handicap, handicap increases by 1. No cap.

**Going DOWN (actual < currentHdcp) — CAPPED AT -2 PER ROUND:**
```
reduction = Math.floor((currentHdcp - actual) / 2)
newHdcp = currentHdcp - Math.min(reduction, 2)
```
For every 2 points below handicap, handicap decreases by 1, but maximum decrease is 2 per round.

**Same (actual === currentHdcp):**
```
newHdcp = currentHdcp
```

### Verification Examples (test ALL of these):
| Current Hdcp | Actual | New Hdcp | Why |
|---|---|---|---|
| 22 | 29 | 25 | Up: floor(7/2)=3, 22+3=25 |
| 22 | 18 | 20 | Down: floor(4/2)=2, min(2,2)=2, 22-2=20 |
| 15 | 16 | 15 | Up: floor(1/2)=0, stays 15 |
| 18 | 17 | 18 | Down: floor(1/2)=0, stays 18 |
| 15 | 12 | 14 | Down: floor(3/2)=1, min(1,2)=1, 15-1=14 |
| 24 | 27 | 25 | Up: floor(3/2)=1, 24+1=25 |
| 20 | 10 | 18 | Down: floor(10/2)=5, min(5,2)=2, cap! 20-2=18 |
| 14 | 14 | 14 | Same, no change |

---

## Initial Player Data (preload on first launch)

```
Visanu    24
Biscuit   18
Julius    22
PK        15
Todd      20
Timmy     15
Tony      14
Rich      15
Josh      14
Jordan    18
Chuck     24
Steve     14
Ben       14
Yut       17
Haj       22
Mikie 22
```

---

## App Screens & Features

### 1. Dashboard (Home Screen)

This is the main screen. It should feel like a sports scoreboard.

**Leaderboard Table** — sorted by current handicap (lowest = best at top):
- Columns: Rank, Player Name, Current Handicap, Wins (🏆 count), Last Round Pts, Change (↑↓ arrow)
- Green ↓ arrow = handicap went down (improving), Red ↑ arrow = went up, Gray — = same/no data
- Highlight the row of the player with the most wins in gold

**Stats Banner** at top showing:
- Total rounds played
- Date of last round
- Current season leader (player with lowest handicap)

**Progress Chart Section** — for each player, show a small visual of their handicap trend:
- Could be a simple sparkline, a mini bar chart, or a list of their last 5-10 handicap values with colored dots
- The key thing: you can quickly see if a player's handicap is trending up or down over time
- At minimum, show a row per player with colored blocks/dots: green dot for rounds where handicap went down, red for up, gray for same — like a form guide in horse racing

**Win Leaderboard** — a separate section or tab showing:
- Players ranked by total wins (most wins at top)
- Show: Player Name, Wins, Win % (wins / rounds played by that player)

**Navigation buttons:** Enter Round Scores, View History, Manage Players, Info/Settings

### 2. Enter Round Scores

- **Date picker** defaulting to today
- List all **active** players, each row showing:
  - Player name + current handicap
  - **Number input** for total Stableford points scored (leave blank if didn't play that round)
  - `inputmode="numeric"` for mobile number keyboard
  - **Live preview** of new handicap as user types, with color coding: green if dropping, red if rising, gray if same
  - Also show the net score (actual minus handicap) live
- **"Save Round" button:**
  - Only records players who have a score entered
  - Stores hdcpBefore, actual, hdcpAfter, and netScore for each player
  - Determines the round winner (lowest net score) and records it
  - Updates each player's currentHdcp in the database
  - Increments the winner's win count
  - Shows a brief "Round saved! Winner: [name]" confirmation
- **"Cancel"** returns to dashboard without saving

### 3. Round History

- List of all rounds, **newest first**
- Each shows: date, number of players, winner name with 🏆
- **Tap to expand:** shows every player's score for that round:
  - Name, Actual Points, Net Score, Handicap Before → After, change arrow
  - Winner highlighted
- **Delete round** with confirmation:
  - When deleted, **recalculate ALL subsequent rounds' handicaps** chronologically from each player's startingHdcp forward through every remaining round
  - Also recalculate win counts from scratch
  - This ensures total data consistency

### 4. Manage Players

- List all players: name, current handicap, wins, active/inactive badge
- **Add player:** name + starting handicap
- **Edit player:** change name or manually set current handicap
- **Toggle active/inactive** — inactive players hidden from score entry but historical data preserved
- **Delete player** with confirmation — keep their scores in past rounds (show as "[deleted]") but remove from roster and leaderboard

### 5. Info / Settings

**Handicap Reference:**
- Stableford points expected = 36 minus Handicap
- Table showing: Handicap 0→36, Expected Points 36→0

**Payout Structure** (number of players × $10 buy-in):
- 1st place: 50% of pot
- 2nd place: 30%
- 3rd place: 20%
- Ties split combined prize equally
- Show a quick calculator: enter number of players, see the payout amounts

**Data Management:**
- **Export Data** — download complete database as JSON file (named `fwb-gaggle-backup-YYYY-MM-DD.json`)
- **Import Data** — upload JSON file, validate structure, show preview of what will be imported, confirm before overwriting
- **Reset All Data** — double confirmation dialog, then clears everything and reloads default players

---

## Design (Mobile-First)

- **Must work great on phone screens** — test at 375px width
- Minimum 44px tap targets on all buttons and interactive elements
- Large inputs: 18px+ font size, generous padding
- Dark green golf-course theme:
  - Primary dark: `#1a472a`, deeper dark: `#0d2818`
  - Gold accent: `#d4af37`
  - Cream background accent: `#f5f0e1`
  - White text on dark
  - Red for handicap going up: `#e8443a`
  - Green for handicap going down: `#4ade80`
- Use **Google Fonts** — pick a bold display font for headings (like Bebas Neue or Oswald) and a clean body font (like Barlow or DM Sans)
- Smooth CSS transitions between screens (slide or fade, ~300ms)
- Optional: subtle CSS-only grass texture on background
- The leaderboard should feel like a **sports scoreboard**, not a spreadsheet
- Win counts should have a trophy emoji 🏆 treatment
- Progress indicators should be immediately visually scannable (color = good/bad at a glance)

---

## Technical Requirements

- **One file: `index.html`** — everything inline
- **IndexedDB** primary storage with localStorage fallback
- Generate IDs: `crypto.randomUUID()` with fallback
- No external API calls — fully offline after first load (only external resource is Google Fonts, which degrades gracefully)
- **Full recalculation function:** Given startingHdcp for all players + chronological list of rounds, rebuild every handicap and win count from scratch. Used when deleting rounds or importing data.
- All async DB operations should show a brief loading state so the UI doesn't feel broken
- Prevent double-tap/double-submit on Save Round button

---

## QA Checklist (verify before finishing)

1. All 8 handicap examples from the table produce correct results
2. Entering a round with some blanks only saves players with scores
3. Round winner is correctly identified (lowest net score)
4. Win counts accumulate correctly across multiple rounds
5. Deleting a middle round recalculates all later handicaps AND win counts correctly
6. Progress/trend display accurately reflects handicap history
7. Export produces valid downloadable JSON; import restores full app state including wins
8. Reset clears everything, reloads default 15 players with 0 wins
9. Number inputs show numeric keyboard on mobile
10. Leaderboard sorts correctly (lowest handicap = rank 1)
11. Player with most wins is visually highlighted on dashboard

