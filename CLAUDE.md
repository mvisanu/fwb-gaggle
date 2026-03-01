# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FWB Gaggle — Stableford Handicap Tracker:** A mobile-first, offline-capable single-page web app for a golf group (~16 players). Tracks weekly Stableford rounds, custom rolling handicaps, wins, skins/greeny winnings, and trends.

## Architecture

- **Single file:** Everything lives in `index.html` — HTML, CSS, and JS inline. No frameworks, no build tools, no bundler.
- **Storage:** IndexedDB (database `"fwbGaggle"`, object stores: `players`, `rounds`) with localStorage fallback.
- **Offline:** Fully functional offline after first load. Only external resource is Google Fonts (degrades gracefully).
- **No build/test/lint commands.** Open `index.html` directly in a browser to run.

## Handicap Calculation (Critical Business Logic)

Custom society handicap where the handicap value equals expected Stableford points.

- **Up (actual > hdcp):** `newHdcp = currentHdcp + Math.floor((actual - currentHdcp) / 2)` — no cap
- **Down (actual < hdcp):** `reduction = Math.floor((currentHdcp - actual) / 2)`, `newHdcp = currentHdcp - Math.min(reduction, 2)` — capped at -2 per round
- **Same:** no change

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
    { "id": "uuid", "name": "Visanu", "startingHdcp": 24, "currentHdcp": 24, "active": true, "wins": 0, "skinsWinnings": 0, "greenyWinnings": 0 }
  ],
  "rounds": [
    {
      "id": "uuid",
      "date": "2026-03-01",
      "scores": [
        { "playerId": "uuid", "playerName": "Visanu", "hdcpBefore": 24, "actual": 22, "hdcpAfter": 23, "netScore": -2, "skinsWon": 0, "greenyWon": 0 }
      ],
      "winnerId": "uuid",
      "winnerName": "Visanu"
    }
  ]
}
```

## Round Deletion & Recalculation

Deleting a round requires full recalculation: reset all players to `startingHdcp`, `wins=0`, `skinsWinnings=0`, `greenyWinnings=0`, replay every remaining round chronologically, recompute all handicaps, win counts, and winnings from scratch.

## App Screens

The dashboard is a single scrolling page (no tabs). All sections stack vertically.

1. **Dashboard** — Stats banner → Leaderboard → Wins bar chart → Winnings pie chart → Win Leaderboard → Form Guide → Nav buttons
2. **Enter Round** — White content panel. Date picker, score inputs (live handicap preview), Skins $ and Greeny $ per player, auto-determines winner on save
3. **Round History** — Expandable round cards (newest first), delete with full recalculation. Skins/Greeny columns appear automatically if round has winnings data
4. **Manage Players** — Add/edit/toggle active/delete players. Sub-line shows skins and greeny totals if non-zero
5. **Settings** — Handicap reference table, payout calculator ($10 buy-in, 50/30/20 split), export/import JSON, Clear Round Data, Load Sample Data, Reset All Data

## Skins & Greeny Tracking

- Per round, per player: `skinsWon` (dollars) and `greenyWon` (dollars) entered on the Enter Round screen
- Player totals: `skinsWinnings` and `greenyWinnings` accumulate across rounds
- `fullRecalculate()` resets these to 0 and re-accumulates from round data
- Dashboard shows: **Wins bar chart** (CSS flexbox, gold gradient bars) and **Winnings pie chart** (SVG, colour-coded slices with legend)

## Sample Data

- Auto-loaded on first launch if no rounds exist (`init()` calls `doSeedSampleData()` when rounds are empty)
- 6 rounds (Jan–Feb 2026) with realistic Stableford scores and skins/greeny amounts
- Settings buttons: **Clear Round Data** (wipes rounds, resets player stats) and **Load Sample Data** (reloads demo rounds)

## Design Tokens

- Dark green theme: primary `#1a472a`, deep `#0d2818`
- Gold accent: `#d4af37`, gold-dark: `#b8960c`, cream: `#f5f0e1`
- Handicap down (good): `#4ade80`, handicap up (bad): `#e8443a`
- White content panels: `--white: #ffffff`, stripe: `--row-stripe: #f1f5f9`
- 44px minimum tap targets, 18px+ input font size
- Google Fonts: Bebas Neue (headings), Barlow (body)
- Screen transitions: fade ~300ms

## Key Technical Constraints

- IDs via `crypto.randomUUID()` with fallback
- `inputmode="numeric"` on score inputs, `inputmode="decimal"` on money inputs
- Prevent double-submit on Save Round (`savingRound` flag)
- All data export as `fwb-gaggle-backup-YYYY-MM-DD.json`
- Enter Round screen wrapped in `.content-panel` (white background); CSS overrides handle input colours on white

## Default Players (preloaded on first launch)

Visanu 24, Biscuit 18, Julius 22, PK 15, Todd 20, Timmy 15, Tony 14, Rich 15, Josh 14, Jordan 18, Chuck 24, Steve 14, Ben 14, Ute 17, Haj 22, Mikie 22

## QA Checklist (verify before finishing)

1. All 8 handicap examples from the verification table produce correct results
2. Entering a round with some blanks only saves players with scores
3. Round winner is correctly identified (lowest net score, tiebreak = lower handicap)
4. Win counts and skins/greeny accumulate correctly across multiple rounds
5. Deleting a middle round recalculates all later handicaps, win counts, AND winnings correctly
6. Progress/trend display accurately reflects handicap history
7. Export produces valid downloadable JSON; import restores full app state including wins and winnings
8. Reset clears everything, reloads default 16 players with 0 wins/winnings
9. Number inputs show numeric keyboard on mobile
10. Leaderboard sorts correctly (lowest handicap = rank 1)
11. Player with most wins is visually highlighted on dashboard
12. Sample data auto-loads on first launch; bar chart and pie chart render correctly
