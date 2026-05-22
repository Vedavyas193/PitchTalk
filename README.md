# ⚡ PitchTalk

**A social, real-time cricket app — follow live matches ball by ball, react to every play, and talk about the game as it happens.**

Inspired by the sports app *Real*, but built for cricket. Cricket is already a ball-by-ball
sport, so every delivery becomes its own discrete, reactable, comment-able event. PitchTalk turns
a live data feed into a scrolling play-by-play, calculates the match state after each ball, rates
how exciting each play is, and wraps the whole thing in a live social layer.

---

## ✨ Core features

- **Live ball-by-ball feed** — every delivery streams in as its own event with auto-generated commentary.
- **Per-play score engine** — each ball recalculates runs, wickets, run rate, and the chase equation
  (runs needed off balls remaining).
- **Excitement rating** — every play gets a 0–100 score based on outcome and match tension.
- **Social layer** — match-wide chat, comments pinned to a specific ball, and 🔥 / 😮 / 👏 reactions
  on both balls and comments.
- **Match hub** — live / upcoming / recent matches, follow teams and matches, live wicket & six toasts.
- **Switchable accent themes** on a dark "broadcast" UI. Fully responsive (phone + desktop).

---

## 🧱 Project status

| Stage | Description | State |
|-------|-------------|-------|
| **1. Web prototype** | Single-file React app with a mock match engine (`PitchTalk.jsx`) | ✅ Done |
| **2. Production web app** | Next.js + Supabase, real cricket data feed, auth, persistence | ⏳ Planned |
| **3. Native app** | React Native (Expo) or Capacitor wrap, reusing the data layer | ⏳ Planned |

> The current prototype runs entirely in-memory with a **simulated** match — no API key, no backend,
> no database required. It exists to validate the concept and the UX. A page refresh resets state.

---

## 🚀 Running the prototype

The prototype is a single React component (`PitchTalk.jsx`). To run it locally in a fresh Vite app:

```bash
npm create vite@latest pitchtalk -- --template react
cd pitchtalk
npm install lucide-react
# replace src/App.jsx with PitchTalk.jsx (and update the import in main.jsx)
npm run dev
```

Dependencies: **React** and **lucide-react** (for icons). Fonts (Anton + DM Sans) load from Google Fonts.

---

## 🗺️ Planned architecture (production)

```
pitchtalk/
├── app/                    # Next.js App Router (routes/pages)
│   ├── page.tsx            # Home — match list
│   ├── match/[id]/         # Live match: Feed + Chat tabs
│   ├── onboarding/         # Pick favourite teams
│   └── profile/
├── lib/                    # Framework-agnostic logic (PORTABLE to React Native)
│   ├── cricketData.ts      # Pluggable data layer: mock provider + live API provider
│   ├── types.ts            # Match, Innings, Ball, Team, Player
│   ├── scoring.ts          # Per-ball score + excitement calculations
│   └── supabase.ts         # Supabase client
├── components/             # Thin, presentational UI
└── public/                 # PWA manifest, icons
```

**Stack (all free-tier to start):**
- **Frontend:** Next.js + TypeScript + Tailwind, deployed on Vercel
- **Backend / DB / Auth / Realtime:** Supabase (Postgres, Auth, Realtime websockets)
- **Cricket data:** pluggable — mock provider by default; live feed via CricAPI / cricketdata.org
  (free tier) for MVP, upgrading to Roanuz or EntitySport for production-grade speed
- **PWA → Native:** ships as an installable PWA first; later wrapped with Capacitor or rebuilt in
  React Native (Expo), reusing the entire `lib/` layer

### Data model (Supabase)
`profiles` · `matches` · `match_follows` · `team_follows` · `comments` · `reactions`
— with Row Level Security so users can only write their own rows.

---

## ⚠️ Notes & honest caveats

- The data layer is the make-or-break piece. Cricket data rights are tightly controlled (IPL, ICC,
  bilateral series have official partners); free feeds are often slower or limited, which is why the
  mock provider is the default and the data layer is built to be swappable.
- Match formats differ wildly (T20 ≈ 3h, ODI ≈ 8h, Test = 5 days) — feed pacing, notifications, and
  excitement scoring should all be format-aware.
- The cricket-fan ↔ fantasy/betting overlap is large in India and was a big engagement driver for
  Real, but it's a regulatory minefield depending on local law. Approach deliberately.

---

## 📋 Roadmap

- [ ] Scaffold the full Next.js + Supabase repo structure
- [ ] Port the mock engine into `lib/cricketData.ts` with a clean provider interface
- [ ] Auth (magic-link + Google) and persistent comments/reactions
- [ ] Wire a live cricket API behind an env-var flag, mock as fallback
- [ ] Second innings / batting-first scorecards; multiple concurrent live matches
- [ ] PWA install + push notifications
- [ ] Native app conversion

---

*Prototype built as a concept demo. Team names, players, and match data in the prototype are
fictional.*
