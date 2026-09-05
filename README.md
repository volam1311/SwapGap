# GapSwap

AI-powered triage: diagnose the misconception, map it on a Learning GPS, route a scripted peer check, then verify — or escalate to Student Success.

## Demo login

Maya (needs Nested loops, facilitates Functions):

- Email: `maya@qut.edu.au`
- Password: `gapswap`

Alex (Maya’s session partner — facilitates Nested loops, needs Functions):

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

People on the same Wi‑Fi can open the **Network** URL Vite prints (for example `http://192.168.x.x:5173`). Campus Wi‑Fi (including QUT) often blocks phones from reaching laptops. If it hangs, keep `npm run dev` running and in a **second** terminal run `npm run share` — that prints a public `https://….trycloudflare.com` link anyone can open. The public certificate page `/c/GS-2026S2-MAYA` does not require login.

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
4. Find a Match → Alex T. (verified Nested loops, pass rate, on-time) → Confirm session, **or** open the already-booked GapSwap with Alex.
5. In another browser, **Continue as Alex** to join the same session from the other side.
6. Join when ready → run the session pack (three prompts + exercise) / switch roles → Ready to verify.
7. Answer the transfer quiz → Nested loops turns **Mastered**, or fail and see the Student Success escalation card.
8. Open **Certificate** — copy a CV bullet or Add to LinkedIn for the Semester 2, 2026 Peer Teaching & Support credential.

## What is real vs stand-in

Shipped: diagnosis, GPS, three-tier routing copy, reciprocal matching (swap / help / group / mentor / async), scheduling, scripted session pack, AI hints, post-session transfer check, Student Success escalation card, notifications, questions board, report/block, university-email verification flag, semester Peer Teaching & Support certificate (CV / LinkedIn).

Stand-ins called out on the landing page: live two-way video (Jitsi link + local camera preview), full whiteboard, Google Calendar OAuth (download `.ics` instead), university SSO.
