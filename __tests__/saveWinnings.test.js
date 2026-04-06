/**
 * Tests for the Update Winnings save flow in Firestore mode.
 *
 * Bug: putRound/putPlayer wrote to Firestore but left _fsRounds/_fsPlayers
 * stale. fullRecalculate() short-circuited to the stale cache, so the new
 * winningsOnly round was invisible — player winnings were never accumulated.
 *
 * Fix: putRound and putPlayer upsert into _fsRounds/_fsPlayers after each
 * Firestore .set(), keeping the cache coherent before fullRecalculate runs.
 */

'use strict';

// ─── Inline core logic (extracted from index.html) ──────────────────────────

const MIN_HDCP = 14;

function calcHandicap(currentHdcp, actual) {
  if (actual === currentHdcp) return Math.max(MIN_HDCP, currentHdcp);
  if (actual > currentHdcp)
    return Math.max(MIN_HDCP, currentHdcp + Math.floor((actual - currentHdcp) / 2));
  const reduction = Math.floor((currentHdcp - actual) / 2);
  return Math.max(MIN_HDCP, currentHdcp - Math.min(reduction, 2));
}

function _winningsWinner(scores) {
  let best = 0, winnerId = null, winnerName = '';
  for (const s of scores) {
    if ((s.payoutWon || 0) > best) {
      best = s.payoutWon;
      winnerId = s.playerId;
      winnerName = s.playerName || '';
    }
  }
  if (!winnerId) {
    let bestScore = -1;
    for (const s of scores) {
      if (s.actual != null && s.actual > bestScore) {
        bestScore = s.actual;
        winnerId = s.playerId;
        winnerName = s.playerName || '';
      }
    }
  }
  return { winnerId, winnerName };
}

// ─── Minimal Firestore store simulation ─────────────────────────────────────

function makeFirestoreDB(initialRounds = [], initialPlayers = []) {
  const roundStore = new Map(initialRounds.map(r => [r.id, { ...r }]));
  const playerStore = new Map(initialPlayers.map(p => [p.id, { ...p }]));

  function makeCol(store) {
    return {
      doc(id) {
        return {
          async set(data) { store.set(id, { id, ...data }); },
          async get()     { return { exists: store.has(id), data: () => ({ ...store.get(id) }) }; },
        };
      },
      async get() {
        return { docs: [...store.values()].map(d => ({ id: d.id, data: () => ({ ...d }) })) };
      },
    };
  }

  const db = {
    _roundStore: roundStore,
    _playerStore: playerStore,
    batch() {
      const ops = [];
      return {
        set(ref, data) { ops.push({ ref, data }); },
        async commit() { ops.forEach(op => op.ref._set(op.data)); },
      };
    },
    collection(path) {
      // groups/{GROUP}/players  or  groups/{GROUP}/rounds
      return {
        doc(id) {
          return {
            collection(sub) {
              if (sub === 'rounds')  return makeColWithBatchRef(roundStore);
              if (sub === 'players') return makeColWithBatchRef(playerStore);
              return makeCol(new Map());
            },
          };
        },
      };
    },
  };

  function makeColWithBatchRef(store) {
    return {
      doc(id) {
        return {
          _set(data) { store.set(id, { id, ...data }); },
          async set(data) { store.set(id, { id, ...data }); },
          async get()     { return { exists: store.has(id), data: () => ({ ...store.get(id) }) }; },
        };
      },
      async get() {
        return { docs: [...store.values()].map(d => ({ id: d.id, data: () => ({ ...d }) })) };
      },
    };
  }

  return db;
}

// ─── Minimal app state factory ───────────────────────────────────────────────

function makeAppState(initialRounds = [], initialPlayers = []) {
  const firestoreDB = makeFirestoreDB(initialRounds, initialPlayers);
  let _fsRounds  = null;
  let _fsPlayers = null;

  const GROUP = 'monday';

  function fsRoundsCol()  {
    return firestoreDB.collection('groups').doc(GROUP).collection('rounds');
  }
  function fsPlayersCol() {
    return firestoreDB.collection('groups').doc(GROUP).collection('players');
  }
  function fsClean(obj) { return JSON.parse(JSON.stringify(obj)); }

  async function getRounds() {
    if (_fsRounds !== null) return [..._fsRounds];
    const snap = await fsRoundsCol().get();
    _fsRounds = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return [..._fsRounds];
  }

  async function getPlayers() {
    if (_fsPlayers !== null) return [..._fsPlayers];
    const snap = await fsPlayersCol().get();
    _fsPlayers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return [..._fsPlayers];
  }

  async function putRound(r) {
    const { id, ...data } = r;
    await fsRoundsCol().doc(id).set(fsClean(data));
    // Cache sync fix — this is what we're testing
    if (_fsRounds !== null) {
      const idx = _fsRounds.findIndex(x => x.id === r.id);
      if (idx >= 0) _fsRounds[idx] = r; else _fsRounds.push(r);
    }
  }

  async function putPlayer(p) {
    const { id, ...data } = p;
    await fsPlayersCol().doc(id).set(fsClean(data));
    // Cache sync fix
    if (_fsPlayers !== null) {
      const idx = _fsPlayers.findIndex(x => x.id === p.id);
      if (idx >= 0) _fsPlayers[idx] = p; else _fsPlayers.push(p);
    }
  }

  async function fullRecalculate() {
    const players = await getPlayers();
    const rounds  = await getRounds();

    for (const p of players) {
      p.currentHdcp     = p.startingHdcp;
      p.wins            = 0;
      p.skinsWinnings   = 0;
      p.greenyWinnings  = 0;
      p.payoutWinnings  = 0;
    }

    rounds.sort((a, b) => a.date.localeCompare(b.date) || (a.id > b.id ? 1 : -1));

    for (const round of rounds) {
      if (round.winningsOnly) {
        for (const score of round.scores) {
          const player = players.find(p => p.id === score.playerId);
          if (!player) continue;
          player.payoutWinnings = (player.payoutWinnings || 0) + (score.payoutWon  || 0);
          player.skinsWinnings  = (player.skinsWinnings  || 0) + (score.skinsWon   || 0);
          player.greenyWinnings = (player.greenyWinnings || 0) + (score.greenyWon  || 0);
        }
        const { winnerId, winnerName } = _winningsWinner(round.scores);
        round.winnerId   = winnerId;
        round.winnerName = winnerName;
        const winnerPlayer = players.find(p => p.id === winnerId);
        if (winnerPlayer) winnerPlayer.wins++;
        continue;
      }

      let bestNet = -Infinity, winnerId = null, winnerHdcp = Infinity;
      for (const score of round.scores) {
        const player = players.find(p => p.id === score.playerId);
        if (!player) continue;
        score.hdcpBefore  = player.currentHdcp;
        score.hdcpAfter   = calcHandicap(player.currentHdcp, score.actual);
        score.netScore    = score.actual - score.hdcpBefore;
        player.currentHdcp = score.hdcpAfter;
        player.skinsWinnings  = (player.skinsWinnings  || 0) + (score.skinsWon  || 0);
        player.greenyWinnings = (player.greenyWinnings || 0) + (score.greenyWon || 0);
        if (score.netScore > bestNet ||
            (score.netScore === bestNet && score.hdcpBefore < winnerHdcp)) {
          bestNet = score.netScore; winnerId = score.playerId; winnerHdcp = score.hdcpBefore;
        }
      }
      round.winnerId = winnerId;
      const wp = players.find(p => p.id === winnerId);
      round.winnerName = wp ? wp.name : '';
      if (wp) wp.wins++;
    }

    // Batch-write all players back (simplified — no chunking needed in tests)
    const batch = firestoreDB.batch();
    for (const p of players) {
      const { id, ...data } = p;
      batch.set(fsPlayersCol().doc(id), fsClean(data));
    }
    await batch.commit();

    _fsPlayers = [...players];
    _fsRounds  = [...rounds];

    return { players, rounds };
  }

  // Expose internals for test assertions
  return {
    getRounds, getPlayers, putRound, putPlayer, fullRecalculate,
    getCache: () => ({ _fsRounds, _fsPlayers }),
    firestoreDB,
    seedCache: (r, p) => { _fsRounds = r; _fsPlayers = p; },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const P1 = { id: 'p1', name: 'Alice', startingHdcp: 20, currentHdcp: 20,
             wins: 0, skinsWinnings: 0, greenyWinnings: 0, payoutWinnings: 0, active: true };
const P2 = { id: 'p2', name: 'Bob',   startingHdcp: 18, currentHdcp: 18,
             wins: 0, skinsWinnings: 0, greenyWinnings: 0, payoutWinnings: 0, active: true };

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('putRound — Firestore cache sync', () => {
  test('adds new round into _fsRounds cache immediately', async () => {
    const app = makeAppState([], [P1]);
    // Prime the cache by calling getRounds once
    await app.getRounds();
    expect(app.getCache()._fsRounds).toHaveLength(0);

    const newRound = {
      id: 'r1', date: '2026-03-10', winningsOnly: true,
      scores: [{ playerId: 'p1', playerName: 'Alice', payoutWon: 20, skinsWon: 0, greenyWon: 0 }],
      winnerId: 'p1', winnerName: 'Alice',
    };

    await app.putRound(newRound);

    // Cache must contain the new round immediately — before fullRecalculate
    expect(app.getCache()._fsRounds).toHaveLength(1);
    expect(app.getCache()._fsRounds[0].id).toBe('r1');
  });

  test('updates existing round in _fsRounds cache', async () => {
    const existing = {
      id: 'r1', date: '2026-03-10', winningsOnly: true,
      scores: [{ playerId: 'p1', playerName: 'Alice', payoutWon: 10, skinsWon: 0, greenyWon: 0 }],
      winnerId: 'p1', winnerName: 'Alice',
    };
    const app = makeAppState([existing], [P1]);
    await app.getRounds(); // prime cache

    const updated = { ...existing, scores: [{ ...existing.scores[0], payoutWon: 25 }] };
    await app.putRound(updated);

    expect(app.getCache()._fsRounds[0].scores[0].payoutWon).toBe(25);
  });

  test('does NOT add to cache when cache is null (not yet loaded)', async () => {
    const app = makeAppState([], [P1]);
    // Don't call getRounds() — cache stays null
    const newRound = { id: 'r1', date: '2026-03-10', winningsOnly: true, scores: [], winnerId: null, winnerName: '' };
    await app.putRound(newRound);

    // Cache still null — getRounds will load from Firestore
    expect(app.getCache()._fsRounds).toBeNull();
    // But Firestore has it
    const fromStore = await app.getRounds();
    expect(fromStore).toHaveLength(1);
  });
});

describe('getRounds — returns newly saved round before fullRecalculate', () => {
  test('getRounds sees new round added via putRound', async () => {
    const app = makeAppState([], [P1]);
    await app.getRounds(); // prime cache

    const newRound = {
      id: 'r1', date: '2026-03-10', winningsOnly: true,
      scores: [{ playerId: 'p1', playerName: 'Alice', payoutWon: 30, skinsWon: 0, greenyWon: 0 }],
      winnerId: 'p1', winnerName: 'Alice',
    };
    await app.putRound(newRound);

    const rounds = await app.getRounds();
    expect(rounds).toHaveLength(1);
    expect(rounds[0].id).toBe('r1');
  });
});

describe('fullRecalculate — accumulates winningsOnly payouts', () => {
  test('payoutWinnings accumulated for a single winningsOnly round', async () => {
    const app = makeAppState([], [{ ...P1 }, { ...P2 }]);
    await app.getPlayers(); // prime player cache

    const round = {
      id: 'r1', date: '2026-03-10', winningsOnly: true,
      scores: [
        { playerId: 'p1', playerName: 'Alice', payoutWon: 40, skinsWon: 5, greenyWon: 2 },
        { playerId: 'p2', playerName: 'Bob',   payoutWon: 0,  skinsWon: 3, greenyWon: 0 },
      ],
      winnerId: null, winnerName: '',
    };

    await app.putRound(round);
    const { players } = await app.fullRecalculate();

    const alice = players.find(p => p.id === 'p1');
    const bob   = players.find(p => p.id === 'p2');

    expect(alice.payoutWinnings).toBe(40);
    expect(alice.skinsWinnings).toBe(5);
    expect(alice.greenyWinnings).toBe(2);
    expect(alice.wins).toBe(1); // Alice won (highest payout)

    expect(bob.payoutWinnings).toBe(0);
    expect(bob.skinsWinnings).toBe(3);
    expect(bob.greenyWinnings).toBe(0);
    expect(bob.wins).toBe(0);
  });

  test('winningsOnly rounds do NOT change player handicaps', async () => {
    const app = makeAppState([], [{ ...P1 }]);
    await app.getPlayers();

    const round = {
      id: 'r1', date: '2026-03-10', winningsOnly: true,
      scores: [{ playerId: 'p1', playerName: 'Alice', actual: 35, payoutWon: 10, skinsWon: 0, greenyWon: 0 }],
      winnerId: null, winnerName: '',
    };
    await app.putRound(round);
    const { players } = await app.fullRecalculate();

    const alice = players.find(p => p.id === 'p1');
    // Handicap must stay at startingHdcp (20), not change from actual=35
    expect(alice.currentHdcp).toBe(20);
  });

  test('multiple winningsOnly rounds accumulate across rounds', async () => {
    const app = makeAppState([], [{ ...P1 }]);
    await app.getPlayers();

    await app.putRound({
      id: 'r1', date: '2026-03-01', winningsOnly: true,
      scores: [{ playerId: 'p1', playerName: 'Alice', payoutWon: 20, skinsWon: 0, greenyWon: 0 }],
      winnerId: 'p1', winnerName: 'Alice',
    });
    await app.putRound({
      id: 'r2', date: '2026-03-08', winningsOnly: true,
      scores: [{ playerId: 'p1', playerName: 'Alice', payoutWon: 15, skinsWon: 5, greenyWon: 3 }],
      winnerId: 'p1', winnerName: 'Alice',
    });

    const { players } = await app.fullRecalculate();
    const alice = players.find(p => p.id === 'p1');

    expect(alice.payoutWinnings).toBe(35);  // 20 + 15
    expect(alice.skinsWinnings).toBe(5);
    expect(alice.greenyWinnings).toBe(3);
    expect(alice.wins).toBe(2);
  });
});

describe('full saveWinningsEntry flow simulation', () => {
  test('new winningsOnly round saves and player winnings persist in Firestore', async () => {
    const app = makeAppState([], [{ ...P1 }, { ...P2 }]);
    // Prime caches (simulates app already loaded)
    await app.getPlayers();
    await app.getRounds();

    // Simulate saveWinningsEntry for a NEW date
    const scores = [
      { playerId: 'p1', playerName: 'Alice', payoutWon: 50, skinsWon: 0, greenyWon: 0 },
      { playerId: 'p2', playerName: 'Bob',   payoutWon: 0,  skinsWon: 0, greenyWon: 0 },
    ];
    const { winnerId: wId, winnerName: wName } = _winningsWinner(scores);
    const newRound = { id: 'rnew', date: '2026-04-01', winningsOnly: true, scores, winnerId: wId, winnerName: wName };

    await app.putRound(newRound);   // ← this is the call under test
    await app.fullRecalculate();    // ← must see the new round

    // Re-load players from Firestore to confirm they were actually persisted
    app.seedCache(null, null); // clear cache — force fresh load from store
    const freshPlayers = await app.getPlayers();
    const alice = freshPlayers.find(p => p.id === 'p1');
    const bob   = freshPlayers.find(p => p.id === 'p2');

    expect(alice.payoutWinnings).toBe(50);
    expect(alice.wins).toBe(1);
    expect(bob.payoutWinnings).toBe(0);
    expect(bob.wins).toBe(0);
  });

  test('updating existing winningsOnly round recalculates winnings correctly', async () => {
    const existingRound = {
      id: 'r1', date: '2026-03-15', winningsOnly: true,
      scores: [
        { playerId: 'p1', playerName: 'Alice', payoutWon: 10, skinsWon: 0, greenyWon: 0 },
        { playerId: 'p2', playerName: 'Bob',   payoutWon: 5,  skinsWon: 0, greenyWon: 0 },
      ],
      winnerId: 'p1', winnerName: 'Alice',
    };
    const app = makeAppState([existingRound], [{ ...P1 }, { ...P2 }]);
    await app.getPlayers();
    await app.getRounds();

    // Update: Bob now has higher payout
    const updated = {
      ...existingRound,
      scores: [
        { playerId: 'p1', playerName: 'Alice', payoutWon: 10, skinsWon: 0, greenyWon: 0 },
        { playerId: 'p2', playerName: 'Bob',   payoutWon: 30, skinsWon: 0, greenyWon: 0 },
      ],
    };
    const { winnerId, winnerName } = _winningsWinner(updated.scores);
    updated.winnerId = winnerId;
    updated.winnerName = winnerName;

    await app.putRound(updated);
    await app.fullRecalculate();

    app.seedCache(null, null);
    const freshPlayers = await app.getPlayers();
    const alice = freshPlayers.find(p => p.id === 'p1');
    const bob   = freshPlayers.find(p => p.id === 'p2');

    expect(alice.payoutWinnings).toBe(10);
    expect(alice.wins).toBe(0);
    expect(bob.payoutWinnings).toBe(30);
    expect(bob.wins).toBe(1);
  });
});

describe('_winningsWinner', () => {
  test('picks highest payoutWon as winner', () => {
    const scores = [
      { playerId: 'p1', playerName: 'Alice', payoutWon: 10 },
      { playerId: 'p2', playerName: 'Bob',   payoutWon: 40 },
    ];
    expect(_winningsWinner(scores)).toEqual({ winnerId: 'p2', winnerName: 'Bob' });
  });

  test('falls back to highest actual score when no payouts', () => {
    const scores = [
      { playerId: 'p1', playerName: 'Alice', payoutWon: 0, actual: 28 },
      { playerId: 'p2', playerName: 'Bob',   payoutWon: 0, actual: 31 },
    ];
    expect(_winningsWinner(scores)).toEqual({ winnerId: 'p2', winnerName: 'Bob' });
  });

  test('returns null winnerId when scores is empty', () => {
    expect(_winningsWinner([])).toEqual({ winnerId: null, winnerName: '' });
  });
});

describe('calcHandicap — verification table from CLAUDE.md', () => {
  test.each([
    [22, 29, 25, '+floor(7/2)=3'],
    [22, 18, 20, '-min(floor(4/2),2)=2'],
    [15, 16, 15, '+floor(1/2)=0'],
    [18, 17, 18, '-floor(1/2)=0'],
    [15, 12, 14, '-min(floor(3/2),2)=1, MIN_HDCP floor'],
    [24, 27, 25, '+floor(3/2)=1'],
    [20, 10, 18, '-min(floor(10/2),2)=2 capped'],
    [14, 14, 14, 'no change'],
  ])('hdcp=%i actual=%i → %i (%s)', (hdcp, actual, expected) => {
    expect(calcHandicap(hdcp, actual)).toBe(expected);
  });
});
