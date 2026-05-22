import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Zap, Flame, MessageCircle, Send, Play, Pause, ChevronLeft,
  TrendingUp, Users, Check, X, Activity, Trophy, Sparkles,
  Gauge, Clock, FastForward,
} from "lucide-react";

/* ============================================================
   PitchTalk — a Real-style social cricket app (web prototype)
   Single-file interactive demo. Mock match engine, in-memory state.
   ============================================================ */

/* ---------- THEMES (dark base, switchable accent — Real-style) ---------- */
const THEMES = {
  bolt:  { name: "Bolt",  accent: "#C6F432", accentInk: "#0B0D0F", glow: "rgba(198,244,50,0.45)" },
  blaze: { name: "Blaze", accent: "#FF6B35", accentInk: "#0B0D0F", glow: "rgba(255,107,53,0.45)" },
  frost: { name: "Frost", accent: "#38E1FF", accentInk: "#0B0D0F", glow: "rgba(56,225,255,0.45)" },
  punch: { name: "Punch", accent: "#FF2D8E", accentInk: "#0B0D0F", glow: "rgba(255,45,142,0.45)" },
};

/* ---------- TEAMS & PLAYERS (fictional, no real IP) ---------- */
const TEAMS = {
  HAWKS: { code: "HYD", name: "Hyderabad Hawks", short: "Hawks", color: "#7C5CFF" },
  BOLTS: { code: "BLR", name: "Bengaluru Bolts", short: "Bolts", color: "#FF8A3D" },
  KINGS: { code: "KOC", name: "Coastal Kings",   short: "Kings", color: "#16C79A" },
  STORM: { code: "JAI", name: "Desert Storm",    short: "Storm", color: "#E84545" },
};

const BATTERS = ["R. Menon", "A. Kapoor", "S. Iyer", "D. Pawar", "K. Reddy", "M. Khan", "T. Nair", "V. Bose"];
const BOWLERS = ["J. Sandhu", "P. Rao", "G. Mathews", "H. Singh", "L. Fernando"];

/* ---------- BALL OUTCOME MODEL ---------- */
// weighted outcomes for a T20 death-overs-ish chase
const OUTCOMES = [
  { k: "0",  w: 26, runs: 0, wicket: false },
  { k: "1",  w: 30, runs: 1, wicket: false },
  { k: "2",  w: 11, runs: 2, wicket: false },
  { k: "3",  w: 2,  runs: 3, wicket: false },
  { k: "4",  w: 13, runs: 4, wicket: false },
  { k: "6",  w: 9,  runs: 6, wicket: false },
  { k: "W",  w: 6,  runs: 0, wicket: true  },
  { k: "wd", w: 2,  runs: 1, wicket: false, extra: "wide" },
  { k: "nb", w: 1,  runs: 1, wicket: false, extra: "noball" },
];

function pickOutcome() {
  const total = OUTCOMES.reduce((s, o) => s + o.w, 0);
  let r = Math.random() * total;
  for (const o of OUTCOMES) { if ((r -= o.w) <= 0) return o; }
  return OUTCOMES[0];
}

/* ---------- COMMENTARY ---------- */
const LINES = {
  "0": ["dabs it to the field, no run.", "beaten outside off!", "solid defence, dot ball.", "good length, blocked back."],
  "1": ["nudged to mid-on for a single.", "tucked away for one.", "quick single taken!", "worked to leg, they scamper one."],
  "2": ["placed into the gap, comes back for two.", "driven for a couple.", "good running, two runs."],
  "3": ["into the deep, they sprint three!", "three runs, great running between the wickets."],
  "4": ["FOUR! laced through the covers!", "FOUR! pulled away to the fence!", "FOUR! threaded past point, superb.", "FOUR! flicked off the pads, races away."],
  "6": ["SIX! launched over long-on!", "SIX! into the stands, what a hit!", "SIX! down the ground, massive!", "SIX! flat and hard over deep midwicket!"],
  "W": ["WICKET! holes out to long-on!", "WICKET! cleaned him up, timber!", "WICKET! caught behind, big one!", "WICKET! plumb in front, given!"],
  "wd": ["sprayed down leg, called wide."],
  "nb": ["overstepped — no ball, free hit coming!"],
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/* ---------- EXCITEMENT RATING (Real's signature feature) ---------- */
function excitement(outcome, ctx) {
  const tight = ctx.ballsLeft <= 36 && ctx.required <= ctx.ballsLeft * 2; // death + close
  let base;
  switch (outcome.k) {
    case "W": base = 86; break;
    case "6": base = 80; break;
    case "4": base = 66; break;
    case "0": base = tight ? 58 : 30; break;
    case "2": case "3": base = 42; break;
    case "1": base = tight ? 38 : 22; break;
    default: base = 34;
  }
  if (tight) base += 8;
  if (ctx.ballsLeft <= 12) base += 6;
  return Math.max(8, Math.min(99, Math.round(base + (Math.random() * 8 - 4))));
}

/* ---------- HELPERS ---------- */
const oversStr = (balls) => `${Math.floor(balls / 6)}.${balls % 6}`;
const rr = (runs, balls) => (balls === 0 ? 0 : (runs / (balls / 6))).toFixed(2);
const uid = () => Math.random().toString(36).slice(2, 9);

/* ---------- INITIAL LIVE MATCH (a mid-chase, feels alive instantly) ---------- */
function makeInitialLive() {
  const target = 178;
  let balls = 68;            // 11.2 overs done
  let runs = 96;
  let wkts = 3;
  let strikerIdx = 3, nonStrikerIdx = 4, bowlerIdx = 2;

  const feed = [];
  // seed a few recent balls so the feed isn't empty
  const seed = ["1", "4", "0", "6", "1", "W", "2"];
  let sRuns = runs - 14, sWk = wkts - 1, sBalls = balls - 7;
  let sStriker = 2;
  for (const k of seed) {
    const o = OUTCOMES.find((x) => x.k === k);
    sBalls += o.extra ? 0 : 1;
    sRuns += o.runs;
    if (o.wicket) sWk += 1;
    const ctx = { ballsLeft: 120 - sBalls, required: target - sRuns };
    feed.unshift({
      id: uid(), k,
      batter: BATTERS[sStriker % BATTERS.length],
      bowler: BOWLERS[bowlerIdx],
      runs: o.runs, wicket: o.wicket, extra: o.extra,
      text: pick(LINES[k]),
      over: oversStr(sBalls),
      scoreAfter: sRuns, wktsAfter: sWk,
      rrAfter: rr(sRuns, sBalls),
      reqAfter: Math.max(0, target - sRuns),
      ballsLeftAfter: Math.max(0, 120 - sBalls),
      xcite: excitement(o, ctx),
      reactions: { fire: Math.floor(Math.random()*40), wow: Math.floor(Math.random()*15), clap: Math.floor(Math.random()*20) },
      mine: {}, comments: [],
    });
    if (o.wicket) sStriker = sWk + 1; else if (o.runs % 2 === 1) sStriker++;
  }

  return {
    target, balls, runs, wkts, strikerIdx, nonStrikerIdx, bowlerIdx,
    battingTeam: "HAWKS", bowlingTeam: "BOLTS",
    finished: false, result: null, feed,
  };
}

/* ---------- OTHER (static) MATCHES for the list ---------- */
const OTHER_MATCHES = [
  { id: "m2", status: "live", fmt: "ODI", a: "KINGS", b: "STORM",
    line: "Kings 214/5 (38.2) · need 41 off 70", static: true,
    feed: [
      { k: "4", text: "FOUR! crunched through cover.", over: "38.2", batter: "P. D'Souza", bowler: "Z. Ali" },
      { k: "1", text: "single to deep point.", over: "38.1", batter: "P. D'Souza", bowler: "Z. Ali" },
      { k: "0", text: "good yorker, dug out.", over: "37.6", batter: "N. Roy", bowler: "Z. Ali" },
    ] },
  { id: "m3", status: "upcoming", fmt: "T20", a: "BOLTS", b: "KINGS", line: "Starts in 2h 15m" },
  { id: "m4", status: "upcoming", fmt: "Test", a: "STORM", b: "HAWKS", line: "Tomorrow · Day 1, 09:30" },
  { id: "m5", status: "done", fmt: "T20", a: "HAWKS", b: "STORM", line: "Hawks won by 6 wkts" },
  { id: "m6", status: "done", fmt: "ODI", a: "BOLTS", b: "STORM", line: "Bolts won by 22 runs" },
];

const SEED_NAMES = ["sixmachine", "coverdrive_99", "yorkerlife", "midwicket_maven", "third_man", "googly_guru", "pitchmap"];
const seedComments = (mid) => ([
  { id: uid(), user: "sixmachine", body: "this chase is COOKING 🔥 need a big over here", t: Date.now()-220000, fire: 12, mine: false },
  { id: uid(), user: "yorkerlife", body: "bring back the spinner, batters set now", t: Date.now()-120000, fire: 4, mine: false },
  { id: uid(), user: "coverdrive_99", body: "Menon looks unreal today, calling it now", t: Date.now()-40000, fire: 8, mine: false },
]);

/* ============================================================
   APP
   ============================================================ */
export default function App() {
  const [themeKey, setThemeKey] = useState("bolt");
  const theme = THEMES[themeKey];

  const [view, setView] = useState("list");        // list | match
  const [openMatch, setOpenMatch] = useState("featured");
  const [tab, setTab] = useState("feed");          // feed | chat
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);           // 1x, 2x, 3x
  const [follows, setFollows] = useState({ featured: true });
  const [toast, setToast] = useState(null);
  const [username] = useState("you");

  const [live, setLive] = useState(makeInitialLive);
  const [comments, setComments] = useState({ featured: seedComments("featured"), m2: [] });
  const [draft, setDraft] = useState("");
  const [pinBall, setPinBall] = useState(false);   // attach next comment to latest ball

  const feedRef = useRef(null);
  const chatRef = useRef(null);

  /* ----- the live engine: bowl one ball ----- */
  const bowl = useCallback(() => {
    setLive((prev) => {
      if (prev.finished) return prev;
      const o = pickOutcome();
      const isLegal = !o.extra;
      const newBalls = prev.balls + (isLegal ? 1 : 0);
      const newRuns = prev.runs + o.runs;
      const newWkts = prev.wkts + (o.wicket ? 1 : 0);

      const ctx = { ballsLeft: 120 - newBalls, required: prev.target - newRuns };

      // figure out who's batting
      const batter = BATTERS[prev.strikerIdx % BATTERS.length];
      const bowler = BOWLERS[prev.bowlerIdx % BOWLERS.length];

      // rotation
      let strikerIdx = prev.strikerIdx;
      let nonStrikerIdx = prev.nonStrikerIdx;
      let bowlerIdx = prev.bowlerIdx;
      if (o.wicket) {
        strikerIdx = Math.max(prev.strikerIdx, prev.nonStrikerIdx) + 1;
      } else if (o.runs % 2 === 1) {
        [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];
      }
      if (isLegal && newBalls % 6 === 0) {
        [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];
        bowlerIdx = (prev.bowlerIdx + 1) % BOWLERS.length;
      }

      const ballEntry = {
        id: uid(), k: o.k, batter, bowler,
        runs: o.runs, wicket: o.wicket, extra: o.extra,
        text: pick(LINES[o.k]),
        over: oversStr(newBalls) + (o.extra ? "+" : ""),
        scoreAfter: newRuns, wktsAfter: newWkts,
        rrAfter: rr(newRuns, newBalls),
        reqAfter: Math.max(0, prev.target - newRuns),
        ballsLeftAfter: Math.max(0, 120 - newBalls),
        xcite: excitement(o, ctx),
        reactions: { fire: 0, wow: 0, clap: 0 },
        mine: {}, comments: [],
      };

      // end conditions
      let finished = false, result = null;
      if (newRuns >= prev.target) { finished = true; result = `${TEAMS[prev.battingTeam].short} won by ${10 - newWkts} wickets`; }
      else if (newWkts >= 10) { finished = true; result = `${TEAMS[prev.bowlingTeam].short} won by ${prev.target - newRuns - 1} runs`; }
      else if (newBalls >= 120) { finished = true; result = newRuns >= prev.target ? `${TEAMS[prev.battingTeam].short} won` : `${TEAMS[prev.bowlingTeam].short} won by ${prev.target - newRuns} runs`; }

      // toast on big moments
      if (o.wicket) queueToast({ type: "W", text: `WICKET! ${batter} departs — ${TEAMS[prev.battingTeam].short} ${newRuns}/${newWkts}` });
      else if (o.k === "6") queueToast({ type: "6", text: `SIX! ${batter} goes big — ${TEAMS[prev.battingTeam].short} ${newRuns}/${newWkts}` });
      if (finished) queueToast({ type: "end", text: result });

      return {
        ...prev, balls: newBalls, runs: newRuns, wkts: newWkts,
        strikerIdx, nonStrikerIdx, bowlerIdx,
        finished, result, feed: [ballEntry, ...prev.feed],
      };
    });
  }, []);

  const toastTimer = useRef(null);
  function queueToast(t) {
    setToast(t);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  // run the engine
  useEffect(() => {
    if (!running || live.finished) return;
    const interval = setInterval(bowl, 3600 / speed);
    return () => clearInterval(interval);
  }, [running, speed, live.finished, bowl]);

  // autoscroll chat to bottom on new messages
  useEffect(() => {
    if (tab === "chat" && chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [comments, tab, openMatch]);

  /* ----- reactions on a ball ----- */
  function reactBall(ballId, kind) {
    setLive((prev) => ({
      ...prev,
      feed: prev.feed.map((b) => {
        if (b.id !== ballId) return b;
        const has = b.mine[kind];
        return { ...b, mine: { ...b.mine, [kind]: !has },
          reactions: { ...b.reactions, [kind]: b.reactions[kind] + (has ? -1 : 1) } };
      }),
    }));
  }

  /* ----- post a comment ----- */
  function postComment() {
    const body = draft.trim();
    if (!body) return;
    const matchKey = openMatch;
    const latest = live.feed[0];
    const c = { id: uid(), user: username, body, t: Date.now(), fire: 0, mine: true,
      ballRef: pinBall && matchKey === "featured" && latest ? latest.over : null,
      ballK: pinBall && matchKey === "featured" && latest ? latest.k : null };
    setComments((prev) => ({ ...prev, [matchKey]: [...(prev[matchKey] || []), c] }));
    // if pinned, also attach to the ball in the feed
    if (c.ballRef && matchKey === "featured") {
      setLive((prev) => ({ ...prev, feed: prev.feed.map((b, i) => i === 0 ? { ...b, comments: [...b.comments, { user: username, body }] } : b) }));
    }
    setDraft(""); setPinBall(false);
  }

  function likeComment(matchKey, cid) {
    setComments((prev) => ({
      ...prev,
      [matchKey]: prev[matchKey].map((c) => c.id === cid
        ? { ...c, mine: !c.mine ? c.mine : c.mine, fire: c.fire + (c._liked ? -1 : 1), _liked: !c._liked }
        : c),
    }));
  }

  const requiredRuns = Math.max(0, live.target - live.runs);
  const ballsLeft = Math.max(0, 120 - live.balls);
  const rrr = ballsLeft > 0 ? (requiredRuns / (ballsLeft / 6)).toFixed(2) : "—";

  /* ============================================================ STYLES */
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    .pt-root{
      --accent:${theme.accent};--ink:${theme.accentInk};--glow:${theme.glow};
      --bg:#0B0D0F;--surface:#14171A;--surface2:#1C2024;--surface3:#23282D;
      --border:rgba(255,255,255,0.08);--text:#EEF1F2;--muted:#828B92;
      --wkt:#FF4D4D;--four:#FFC53D;--six:#2EE6A6;
      font-family:'DM Sans',system-ui,sans-serif;color:var(--text);
      background:var(--bg);min-height:100%;
    }
    .pt-root *::-webkit-scrollbar{width:8px;height:8px}
    .pt-root *::-webkit-scrollbar-thumb{background:var(--surface3);border-radius:8px}
    .display{font-family:'Anton',sans-serif;letter-spacing:.5px;text-transform:uppercase}
    .pt-bg{position:fixed;inset:0;z-index:0;pointer-events:none;
      background:
        radial-gradient(900px 500px at 85% -10%, var(--glow), transparent 60%),
        radial-gradient(700px 400px at -10% 110%, rgba(255,255,255,0.04), transparent 60%);
      opacity:.5}
    .pt-shell{position:relative;z-index:1;display:grid;grid-template-columns:1fr;max-width:1180px;margin:0 auto;min-height:100vh}
    @media(min-width:900px){.pt-shell{grid-template-columns:330px 1fr;gap:0}}
    .topbar{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;
      padding:14px 16px;background:rgba(11,13,15,.82);backdrop-filter:blur(12px);border-bottom:1px solid var(--border)}
    .brand{display:flex;align-items:center;gap:9px;font-size:22px}
    .brand .bolt{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--accent);color:var(--ink);box-shadow:0 0 22px var(--glow)}
    .themeswatch{display:flex;gap:7px;align-items:center}
    .sw{width:20px;height:20px;border-radius:6px;cursor:pointer;border:2px solid transparent;transition:.15s}
    .sw:hover{transform:scale(1.12)}
    .sw.on{border-color:#fff}
    .sidebar{border-right:1px solid var(--border);background:rgba(20,23,26,.35)}
    .sec{padding:14px 16px 6px;font-size:11px;letter-spacing:1.5px;color:var(--muted);font-weight:700;text-transform:uppercase}
    .card{margin:6px 12px;padding:13px;border:1px solid var(--border);border-radius:14px;background:var(--surface);cursor:pointer;transition:.15s;position:relative;overflow:hidden}
    .card:hover{border-color:var(--accent);transform:translateY(-1px)}
    .card.active{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent),0 8px 30px rgba(0,0,0,.4)}
    .live-dot{width:8px;height:8px;border-radius:50%;background:var(--wkt);box-shadow:0 0 0 0 var(--wkt);animation:pulse 1.6s infinite}
    @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(255,77,77,.7)}70%{box-shadow:0 0 0 8px rgba(255,77,77,0)}100%{box-shadow:0 0 0 0 rgba(255,77,77,0)}}
    .pill{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:3px 8px;border-radius:999px}
    .pill.live{background:rgba(255,77,77,.14);color:#ff8585}
    .pill.up{background:rgba(255,255,255,.06);color:var(--muted)}
    .pill.done{background:rgba(255,255,255,.05);color:var(--muted)}
    .pill.fmt{background:var(--surface3);color:var(--text)}
    .vs{display:flex;align-items:center;justify-content:space-between;margin-top:9px}
    .team{display:flex;align-items:center;gap:8px;font-weight:700}
    .dot{width:9px;height:9px;border-radius:3px}
    .ml-line{font-size:12.5px;color:var(--muted);margin-top:9px}
    .main{min-width:0}
    .scorehdr{padding:18px 18px 14px;border-bottom:1px solid var(--border);background:linear-gradient(180deg,rgba(255,255,255,.03),transparent)}
    .back{display:none;align-items:center;gap:6px;color:var(--muted);background:none;border:none;cursor:pointer;font-size:14px;margin-bottom:8px}
    @media(max-width:899px){.back{display:inline-flex}.sidebar.hide{display:none}.main.hide{display:none}}
    .scoreline{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
    .bigscore{font-size:46px;line-height:.9}
    .ov{color:var(--muted);font-size:14px}
    .equation{margin-top:10px;display:flex;gap:10px;flex-wrap:wrap}
    .chip{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:11px;background:var(--surface2);border:1px solid var(--border);font-size:12.5px}
    .chip b{font-family:'Anton';font-weight:400;font-size:15px;letter-spacing:.5px}
    .chip .lab{color:var(--muted);font-size:10px;letter-spacing:1px;text-transform:uppercase}
    .followbtn{margin-left:auto;border:1px solid var(--accent);color:var(--accent);background:transparent;font-weight:700;padding:8px 16px;border-radius:11px;cursor:pointer;font-size:13px;display:inline-flex;align-items:center;gap:6px}
    .followbtn.on{background:var(--accent);color:var(--ink)}
    .controls{display:flex;align-items:center;gap:8px;margin-top:12px;flex-wrap:wrap}
    .ctrlbtn{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:10px;border:1px solid var(--border);background:var(--surface2);color:var(--text);cursor:pointer;font-size:12.5px;font-weight:600}
    .ctrlbtn:hover{border-color:var(--accent)}
    .ctrlbtn.on{background:var(--accent);color:var(--ink);border-color:var(--accent)}
    .tabs{display:flex;gap:4px;padding:10px 14px 0;border-bottom:1px solid var(--border);position:sticky;top:61px;background:rgba(11,13,15,.9);backdrop-filter:blur(10px);z-index:10}
    .tab{padding:10px 16px;border:none;background:none;color:var(--muted);font-weight:700;cursor:pointer;font-size:14px;border-bottom:2px solid transparent;display:flex;align-items:center;gap:7px}
    .tab.on{color:var(--text);border-bottom-color:var(--accent)}
    .feed{padding:10px 12px 120px}
    .ball{display:flex;gap:12px;padding:13px;border:1px solid var(--border);border-radius:14px;background:var(--surface);margin-bottom:9px;animation:slidein .35s ease}
    @keyframes slidein{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
    .outcome{flex-shrink:0;width:44px;height:44px;border-radius:12px;display:grid;place-items:center;font-family:'Anton';font-size:18px;background:var(--surface3);color:var(--text);border:1px solid var(--border)}
    .outcome.six{background:rgba(46,230,166,.16);color:var(--six);border-color:rgba(46,230,166,.4)}
    .outcome.four{background:rgba(255,197,61,.16);color:var(--four);border-color:rgba(255,197,61,.4)}
    .outcome.wkt{background:rgba(255,77,77,.18);color:var(--wkt);border-color:rgba(255,77,77,.45)}
    .ball-meta{font-size:11.5px;color:var(--muted);display:flex;gap:8px;flex-wrap:wrap;align-items:center}
    .ball-text{margin:4px 0 8px;font-size:14.5px;font-weight:500}
    .ball-text b{color:var(--text)}
    .scoredelta{font-size:12px;color:var(--muted)}
    .scoredelta b{color:var(--text);font-family:'Anton';font-weight:400;letter-spacing:.4px}
    .xmeter{display:flex;align-items:center;gap:7px;margin:7px 0}
    .xbar{flex:1;height:5px;border-radius:6px;background:var(--surface3);overflow:hidden;max-width:130px}
    .xfill{height:100%;border-radius:6px;background:linear-gradient(90deg,var(--four),var(--wkt))}
    .xlab{font-size:10px;color:var(--muted);letter-spacing:.5px;text-transform:uppercase}
    .reacts{display:flex;gap:6px;margin-top:9px;flex-wrap:wrap}
    .react{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:999px;border:1px solid var(--border);background:var(--surface2);cursor:pointer;font-size:12.5px;transition:.12s}
    .react:hover{border-color:var(--accent)}
    .react.on{border-color:var(--accent);background:rgba(255,255,255,.05)}
    .react .cnt{color:var(--muted);font-size:11.5px;font-weight:700}
    .ballcomments{margin-top:9px;border-top:1px dashed var(--border);padding-top:8px;display:flex;flex-direction:column;gap:5px}
    .bc{font-size:12.5px}.bc b{color:var(--accent)}
    .chat{display:flex;flex-direction:column;height:calc(100vh - 180px)}
    .chatscroll{flex:1;overflow-y:auto;padding:14px 14px 8px;display:flex;flex-direction:column;gap:10px}
    .msg{max-width:80%;padding:9px 12px;border-radius:13px;background:var(--surface2);border:1px solid var(--border)}
    .msg.mine{align-self:flex-end;background:var(--accent);color:var(--ink);border-color:var(--accent)}
    .msg .who{font-size:11px;font-weight:700;color:var(--accent);margin-bottom:2px}
    .msg.mine .who{color:var(--ink);opacity:.7}
    .msg .pin{font-size:10px;display:inline-flex;align-items:center;gap:4px;background:rgba(0,0,0,.18);padding:2px 7px;border-radius:6px;margin-bottom:4px}
    .msg .body{font-size:14px;line-height:1.35}
    .msg .like{margin-top:4px;font-size:11px;color:var(--muted);cursor:pointer;display:inline-flex;gap:4px;align-items:center}
    .msg.mine .like{color:var(--ink);opacity:.75}
    .composer{position:sticky;bottom:0;display:flex;flex-direction:column;gap:8px;padding:12px 14px;background:rgba(11,13,15,.92);backdrop-filter:blur(10px);border-top:1px solid var(--border)}
    .composer-row{display:flex;gap:9px;align-items:center}
    .composer input{flex:1;background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:12px;padding:12px 14px;font-size:14px;font-family:inherit;outline:none}
    .composer input:focus{border-color:var(--accent)}
    .sendbtn{background:var(--accent);color:var(--ink);border:none;width:46px;height:46px;border-radius:12px;display:grid;place-items:center;cursor:pointer;box-shadow:0 0 18px var(--glow)}
    .pintoggle{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--muted);cursor:pointer;user-select:none}
    .pintoggle .box{width:34px;height:19px;border-radius:999px;background:var(--surface3);position:relative;transition:.15s}
    .pintoggle.on .box{background:var(--accent)}
    .pintoggle .knob{position:absolute;top:2px;left:2px;width:15px;height:15px;border-radius:50%;background:#fff;transition:.15s}
    .pintoggle.on .knob{left:17px}
    .toast{position:fixed;left:50%;transform:translateX(-50%);bottom:24px;z-index:50;padding:13px 18px;border-radius:14px;background:var(--surface);border:1px solid var(--accent);box-shadow:0 12px 40px rgba(0,0,0,.5);font-weight:700;font-size:14px;display:flex;align-items:center;gap:9px;animation:pop .25s ease}
    .toast.W{border-color:var(--wkt)} .toast.six{border-color:var(--six)}
    @keyframes pop{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}
    .empty{padding:40px 20px;text-align:center;color:var(--muted);font-size:14px}
    .resultbanner{margin:10px 12px;padding:16px;border-radius:14px;text-align:center;background:var(--accent);color:var(--ink);font-family:'Anton';font-size:20px}
  `;

  /* ----- which match to show ----- */
  const isFeatured = openMatch === "featured";
  const otherMatch = OTHER_MATCHES.find((m) => m.id === openMatch);

  function MatchCard({ id, status, fmt, aCode, bCode, line, featured }) {
    const a = TEAMS[aCode], b = TEAMS[bCode];
    return (
      <div className={"card" + (openMatch === id ? " active" : "")}
           onClick={() => { setOpenMatch(id); setTab("feed"); setView("match"); }}>
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          {status === "live"
            ? <span className="pill live"><span className="live-dot" /> Live</span>
            : status === "upcoming" ? <span className="pill up">Upcoming</span>
            : <span className="pill done">Result</span>}
          <span className="pill fmt">{fmt}</span>
          {featured && <span className="pill fmt" style={{ color: "var(--accent)" }}>★ Featured</span>}
        </div>
        <div className="vs">
          <span className="team"><span className="dot" style={{ background: a.color }} />{a.short}</span>
          <span style={{ color: "var(--muted)", fontSize: 12 }}>vs</span>
          <span className="team">{b.short}<span className="dot" style={{ background: b.color }} /></span>
        </div>
        <div className="ml-line">{line}</div>
      </div>
    );
  }

  return (
    <div className="pt-root">
      <style>{css}</style>
      <div className="pt-bg" />
      <div className="pt-shell">

        {/* SIDEBAR / MATCH LIST */}
        <aside className={"sidebar" + (view === "match" ? " hide" : "")}>
          <div className="topbar">
            <div className="brand display">
              <span className="bolt"><Zap size={18} strokeWidth={2.6} /></span>PitchTalk
            </div>
            <div className="themeswatch">
              {Object.entries(THEMES).map(([k, t]) => (
                <span key={k} className={"sw" + (k === themeKey ? " on" : "")}
                      style={{ background: t.accent }} onClick={() => setThemeKey(k)} title={t.name} />
              ))}
            </div>
          </div>

          <div className="sec">Live now</div>
          <MatchCard id="featured" status="live" fmt="T20" aCode="HAWKS" bCode="BOLTS"
            line={`Hawks ${live.runs}/${live.wkts} (${oversStr(live.balls)}) · ${live.finished ? live.result : `need ${requiredRuns} off ${ballsLeft}`}`}
            featured />
          {OTHER_MATCHES.filter(m => m.status === "live").map(m =>
            <MatchCard key={m.id} id={m.id} status="live" fmt={m.fmt} aCode={m.a} bCode={m.b} line={m.line} />)}

          <div className="sec">Upcoming</div>
          {OTHER_MATCHES.filter(m => m.status === "upcoming").map(m =>
            <MatchCard key={m.id} id={m.id} status="upcoming" fmt={m.fmt} aCode={m.a} bCode={m.b} line={m.line} />)}

          <div className="sec">Recent</div>
          {OTHER_MATCHES.filter(m => m.status === "done").map(m =>
            <MatchCard key={m.id} id={m.id} status="done" fmt={m.fmt} aCode={m.a} bCode={m.b} line={m.line} />)}
          <div style={{ height: 30 }} />
        </aside>

        {/* MAIN / MATCH DETAIL */}
        <main className={"main" + (view === "list" ? " hide" : "")}>
          {/* FEATURED LIVE MATCH */}
          {isFeatured ? (
            <>
              <div className="scorehdr">
                <button className="back" onClick={() => setView("list")}><ChevronLeft size={18} />All matches</button>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                  <span className="pill live"><span className="live-dot" />Live · T20</span>
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>{TEAMS.HAWKS.name} v {TEAMS.BOLTS.name}</span>
                </div>
                <div className="scoreline">
                  <span className="display bigscore">{live.runs}/{live.wkts}</span>
                  <span className="ov">({oversStr(live.balls)} ov) · CRR {rr(live.runs, live.balls)}</span>
                  <button className={"followbtn" + (follows.featured ? " on" : "")}
                    onClick={() => setFollows(f => ({ ...f, featured: !f.featured }))}>
                    {follows.featured ? <><Check size={15} />Following</> : <>+ Follow</>}
                  </button>
                </div>
                <div className="equation">
                  <span className="chip"><Trophy size={14} color="var(--accent)" /><span><span className="lab">Target</span><br /><b>{live.target}</b></span></span>
                  <span className="chip"><TrendingUp size={14} color="var(--accent)" /><span><span className="lab">Need</span><br /><b>{requiredRuns} off {ballsLeft}</b></span></span>
                  <span className="chip"><Gauge size={14} color="var(--accent)" /><span><span className="lab">Req. RR</span><br /><b>{rrr}</b></span></span>
                  <span className="chip"><Users size={14} color="var(--accent)" /><span><span className="lab">Watching</span><br /><b>4.2k</b></span></span>
                </div>
                <div className="controls">
                  <button className="ctrlbtn" onClick={() => setRunning(r => !r)} disabled={live.finished}>
                    {running ? <><Pause size={14} />Pause</> : <><Play size={14} />Resume</>}
                  </button>
                  {[1, 2, 3].map(s => (
                    <button key={s} className={"ctrlbtn" + (speed === s ? " on" : "")} onClick={() => setSpeed(s)}>
                      <FastForward size={13} />{s}x
                    </button>
                  ))}
                  {!live.finished && <span style={{ fontSize: 12, color: "var(--muted)", display: "inline-flex", gap: 6, alignItems: "center" }}><Clock size={13} />new ball every {(3.6 / speed).toFixed(1)}s</span>}
                </div>
              </div>

              <div className="tabs">
                <button className={"tab" + (tab === "feed" ? " on" : "")} onClick={() => setTab("feed")}><Activity size={16} />Play-by-play</button>
                <button className={"tab" + (tab === "chat" ? " on" : "")} onClick={() => setTab("chat")}><MessageCircle size={16} />Chat <span style={{ color: "var(--muted)", fontWeight: 700 }}>{(comments.featured || []).length}</span></button>
              </div>

              {tab === "feed" ? (
                <div className="feed" ref={feedRef}>
                  {live.finished && <div className="resultbanner">🏆 {live.result}</div>}
                  {live.feed.map((b) => {
                    const cls = b.wicket ? "wkt" : b.k === "6" ? "six" : b.k === "4" ? "four" : "";
                    const label = b.wicket ? "W" : b.extra ? b.extra : b.k;
                    return (
                      <div className="ball" key={b.id}>
                        <div className={"outcome " + cls}>{label}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="ball-meta">
                            <span>Over {b.over}</span>·<span>{b.bowler} to {b.batter}</span>
                          </div>
                          <div className="ball-text"><b>{b.text.startsWith("FOUR") || b.text.startsWith("SIX") || b.text.startsWith("WICKET") ? b.text.split("!")[0] + "!" : ""}</b> {b.text.replace(/^(FOUR!|SIX!|WICKET!)/, "")}</div>
                          <div className="scoredelta">
                            {b.extra ? `Extra (${b.extra}) +1 · ` : b.wicket ? "Wicket falls · " : `+${b.runs} run${b.runs === 1 ? "" : "s"} · `}
                            <b>{b.scoreAfter}/{b.wktsAfter}</b> · CRR {b.rrAfter} · need {b.reqAfter} off {b.ballsLeftAfter}
                          </div>
                          <div className="xmeter">
                            <Sparkles size={12} color="var(--accent)" />
                            <span className="xlab">Excitement</span>
                            <span className="xbar"><span className="xfill" style={{ width: b.xcite + "%" }} /></span>
                            <span className="xlab" style={{ color: "var(--text)" }}>{b.xcite}</span>
                          </div>
                          <div className="reacts">
                            <span className={"react" + (b.mine.fire ? " on" : "")} onClick={() => reactBall(b.id, "fire")}>🔥 <span className="cnt">{b.reactions.fire}</span></span>
                            <span className={"react" + (b.mine.wow ? " on" : "")} onClick={() => reactBall(b.id, "wow")}>😮 <span className="cnt">{b.reactions.wow}</span></span>
                            <span className={"react" + (b.mine.clap ? " on" : "")} onClick={() => reactBall(b.id, "clap")}>👏 <span className="cnt">{b.reactions.clap}</span></span>
                          </div>
                          {b.comments.length > 0 && (
                            <div className="ballcomments">
                              {b.comments.map((c, i) => <div className="bc" key={i}><b>@{c.user}</b> {c.body}</div>)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <ChatPanel
                  list={comments.featured || []} chatRef={chatRef}
                  draft={draft} setDraft={setDraft} onSend={postComment}
                  pinBall={pinBall} setPinBall={setPinBall}
                  latest={live.feed[0]} onLike={(cid) => likeComment("featured", cid)}
                  allowPin
                />
              )}
            </>
          ) : (
            /* ---- OTHER MATCH (static info + working chat) ---- */
            <OtherMatchView
              m={otherMatch} setView={setView}
              comments={comments[openMatch] || []}
              draft={draft} setDraft={setDraft}
              onSend={postComment}
              onLike={(cid) => likeComment(openMatch, cid)}
              tab={tab} setTab={setTab} chatRef={chatRef}
            />
          )}
        </main>
      </div>

      {/* TOAST */}
      {toast && (
        <div className={"toast " + (toast.type === "6" ? "six" : toast.type === "W" ? "W" : "")}>
          {toast.type === "6" ? <Flame size={18} color="var(--six)" /> : toast.type === "W" ? <X size={18} color="var(--wkt)" /> : <Trophy size={18} color="var(--accent)" />}
          {toast.text}
        </div>
      )}
    </div>
  );
}

/* ---------- CHAT PANEL ---------- */
function ChatPanel({ list, chatRef, draft, setDraft, onSend, pinBall, setPinBall, latest, onLike, allowPin }) {
  return (
    <div className="chat">
      <div className="chatscroll" ref={chatRef}>
        {list.length === 0 && <div className="empty">No messages yet — start the conversation 👋</div>}
        {list.map((c) => (
          <div className={"msg" + (c.mine ? " mine" : "")} key={c.id}>
            {!c.mine && <div className="who">@{c.user}</div>}
            {c.ballRef && <div className="pin">📌 on ball {c.ballRef} {c.ballK ? `(${c.ballK})` : ""}</div>}
            <div className="body">{c.body}</div>
            <div className="like" onClick={() => onLike(c.id)}>🔥 {c.fire}</div>
          </div>
        ))}
      </div>
      <div className="composer">
        {allowPin && latest && (
          <div className={"pintoggle" + (pinBall ? " on" : "")} onClick={() => setPinBall(p => !p)}>
            <span className="box"><span className="knob" /></span>
            Pin to latest ball — Over {latest.over} ({latest.k})
          </div>
        )}
        <div className="composer-row">
          <input value={draft} placeholder="Say something about the game…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onSend(); }} />
          <button className="sendbtn" onClick={onSend}><Send size={18} /></button>
        </div>
      </div>
    </div>
  );
}

/* ---------- OTHER MATCH VIEW ---------- */
function OtherMatchView({ m, setView, comments, draft, setDraft, onSend, onLike, tab, setTab, chatRef }) {
  if (!m) return null;
  const a = TEAMS[m.a], b = TEAMS[m.b];
  const live = m.status === "live";
  return (
    <>
      <div className="scorehdr">
        <button className="back" onClick={() => setView("list")}><ChevronLeft size={18} />All matches</button>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
          {live ? <span className="pill live"><span className="live-dot" />Live · {m.fmt}</span>
                : m.status === "upcoming" ? <span className="pill up">Upcoming · {m.fmt}</span>
                : <span className="pill done">Result · {m.fmt}</span>}
        </div>
        <div className="scoreline">
          <span className="display" style={{ fontSize: 30 }}>{a.short} <span style={{ color: "var(--muted)" }}>v</span> {b.short}</span>
        </div>
        <div className="ml-line" style={{ fontSize: 14, marginTop: 8 }}>{m.line}</div>
      </div>
      <div className="tabs">
        <button className={"tab" + (tab === "feed" ? " on" : "")} onClick={() => setTab("feed")}><Activity size={16} />Play-by-play</button>
        <button className={"tab" + (tab === "chat" ? " on" : "")} onClick={() => setTab("chat")}><MessageCircle size={16} />Chat</button>
      </div>
      {tab === "feed" ? (
        <div className="feed">
          {!m.feed && <div className="empty">{m.status === "upcoming" ? "Match hasn't started yet — follow it to get notified." : "Match finished. Highlights coming soon."}</div>}
          {m.feed && m.feed.map((bx, i) => {
            const cls = bx.k === "W" ? "wkt" : bx.k === "6" ? "six" : bx.k === "4" ? "four" : "";
            return (
              <div className="ball" key={i}>
                <div className={"outcome " + cls}>{bx.k}</div>
                <div style={{ flex: 1 }}>
                  <div className="ball-meta"><span>Over {bx.over}</span>·<span>{bx.bowler} to {bx.batter}</span></div>
                  <div className="ball-text">{bx.text}</div>
                </div>
              </div>
            );
          })}
          {m.feed && <div className="empty" style={{ fontSize: 12 }}>Live ball-by-ball streaming is enabled for the ★ Featured match in this demo.</div>}
        </div>
      ) : (
        <ChatPanel list={comments} chatRef={chatRef} draft={draft} setDraft={setDraft} onSend={onSend} onLike={onLike} allowPin={false} />
      )}
    </>
  );
}
