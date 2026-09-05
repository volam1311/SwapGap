# GapSwap

AI-powered peer-learning: diagnose the misconception, map it on a Learning GPS, swap knowledge with a peer, then verify that you actually improved.

## Demo login

Maya (needs Nested loops, teaches Functions):

- Email: `maya@qut.edu.au`
- Password: `gapswap`

Alex (Maya’s session partner — teaches Nested loops, needs Functions):

- Email: `alex@qut.edu.au`
- Password: `gapswap`

Or use **Continue as Maya** / **Continue as Alex** on the login page. Those buttons restore the shared demo session.

## Run locally

From the repo root, one terminal is enough:

```bash
npm install
npm run install:all
npm run dev
```

That starts the API on port 4000 and the web app on port 5173. Open [http://localhost:5173](http://localhost:5173). Ctrl+C stops both.

First-time setup: copy `server/.env.example` to `server/.env` and add your `OPENAI_API_KEY`. The database seeds itself if it is empty; run `npm run seed` to reset the Maya demo.

To run the processes separately instead:

```bash
cd server && npm run dev
cd client && npm run dev
```

Without an OpenAI key the nested-loop diagnostic still works using the built-in fallback, so the judge walkthrough is intact.

## Judge walkthrough

1. Land → **Continue as Maya**.
2. Home → Discover Gaps → keep the inner-loop question and **Use my current unit** → Start diagnosis.
3. Answer three checkpoints → Learning GPS shows **Nested loops** as the red gap.
4. Find a Match → Alex T. (~94% reciprocal swap) → Confirm session, **or** open the already-booked GapSwap with Alex.
5. In another browser, **Continue as Alex** to join the same session from the other side.
6. Join when ready → Ask for a hint / switch roles → Ready to verify.
7. Answer the transfer quiz → Nested loops turns **Mastered**.

## What is real vs stand-in

Shipped: diagnosis, GPS, reciprocal matching (swap / help / group / mentor / async), scheduling, session room, AI hints, post-session check, ratings, notifications, questions board, report/block, university-email verification flag.

Stand-ins called out on the landing page: live two-way video (Jitsi link + local camera preview), full whiteboard, Google Calendar OAuth (download `.ics` instead), university SSO.
