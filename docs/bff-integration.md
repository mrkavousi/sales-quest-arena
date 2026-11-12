# Sales Quest game BFF: prototype integration

This frontend integrates with `iciiex/comu-center` at backend commit
`0bd8707933c4d5acd79edd92a91822e320978e69` (PR #11), which adds the JSON demo
login routes. It accepts API version
`1` and content version `sales-quest-arena-7de8a5a0a0da`. The server's six-mission
catalog, categories, difficulty, reward configuration, levels, achievements, mission
views and `date_key` are used in server mode. Translations are display-only and
keyed by stable IDs. A different API or content version is rejected with a clear
error until the client is intentionally updated and tested. If an incompatible or
unrecognized response is detected during a session, the client pauses server writes
and keeps visible unsaved answers until a compatible bootstrap succeeds. The current
BFF has no version precondition on writes, so a deployment changing between checks
cannot be completely prevented by the client; coordinate backend/client releases.

**This is a technical integration proposal, not an approved business policy.**
Game XP and coins are sample values, distinct from the backend's organizational
`score_events`/wallet. The six game missions are not the admin-panel mission model.
Game completion accepts self-reported answers, validates and awards immediately;
there is no photo evidence, operator approval, pending/rejected state, or verified
CRM sale in this flow.

## Run against a local demo backend

In one terminal, prepare and start the compatible backend with **test data only**:

```bash
git clone https://github.com/iciiex/comu-center.git ../comu-center
cd ../comu-center
python3 -m venv .venv
.venv/bin/pip install -e '.[dev]'
KILOOS_ENV=dev .venv/bin/uvicorn app.main:create_app --factory --host 0.0.0.0 --port 8000
```

In another terminal, from this frontend repository:

```bash
npm ci
GAME_BFF_TARGET=http://127.0.0.1:8000 VITE_GAME_MODE=server npm run dev
```

Open the frontend on port 5173. Vite proxies `/api/v1/game/*` on the frontend origin
to the backend, which covers every route the app uses. The backend address is used by
Vite only: browser code always uses same-origin paths and does not call localhost or
another origin directly. `GAME_BFF_TARGET` also configures `vite preview`, not a
production deployment. Bind/secure the demo appropriately for your environment;
do not expose this unauthenticated demo to untrusted users.

`VITE_GAME_MODE=server` sets the **initial build-time default**. Without it the
initial default is the original device-only game. The player's explicit choice is
remembered under `sales-quest-arena:mode:v1` and takes precedence over the default.
Use the connect/device-only buttons on the welcome/profile screens to switch. For
an isolated test, remove only this mode preference or use a fresh browser profile;
do **not** clear `sales-quest-arena:progress:v1`. The single-file `file://` build is
always device-only, as a file has no same-origin HTTP backend.

## Login and session limitations

Sign-in uses only JSON routes that exist in the backend's **dev and test**
environments: `GET /api/v1/game/demo-users` fills the visitor picker (IDs and names
only — no mobile numbers), `POST /api/v1/game/demo-login` takes `{user_id}` and sets
an HttpOnly, SameSite=Lax cookie, and `POST /api/v1/game/logout` clears it. The BFF
independently enforces the visitor role on every game request, so picker IDs are
convenience data, never authorization.

The client never follows a redirect for these calls, never reads or stores the
session token, and keeps no CSRF token outside the in-memory bootstrap snapshot. Each
sign-in is confirmed with a bootstrap request before any player data is rendered; a
401 there is reported as a blocked cookie rather than as a successful login. If
third-party cookies are blocked in an embedded preview, open the frontend in a
top-level browser tab; the game API intentionally does not accept URL tokens as a
workaround.

Because both login routes answer `404` outside dev/test, the picker reports that as
`DEMO_LOGIN_DISABLED` ("demo sign-in is disabled on this server") instead of a wrong
visitor, and a `429` from the per-IP rate limit is shown as "too many attempts".
Switching to the device-only game is not a logout: the demo cookie remains until it
expires, is replaced, or the player uses **Sign out** on the profile screen. Signing
out asks the server to clear the cookie, then returns to the picker with a
confirmation; if the cookie could not be cleared the picker says so and a reload
re-checks the session. Only a `401` counts as an already-ended session. A `403`
(missing or mismatched CSRF token) is reported as a failed sign-out because the
HttpOnly cookie may still be live — the client never claims a success it cannot
verify.

**Demo account selection is not authentication.** Before any public production
release, replace it with approved real authentication or disable demo login outside
dev/test, and review the backend/proxy security configuration. This frontend alone
cannot secure that backend endpoint.

## Data, offline behavior and retries

- Local and server games are separate. The existing device-only save remains under
  `sales-quest-arena:progress:v1`; neither XP, coins, drafts nor history are uploaded
  or converted into server progress. Switching modes does not erase either game.
- Server mode boots asynchronously and renders the server projection, not a locally
  calculated reward. Profile changes and drafts must be acknowledged. Draft changes
  are coalesced and ordered; save-and-exit waits for confirmation. Failed unsaved
  edits remain in the open screen's memory and can be retried; closing/reloading
  that screen may lose them. They are **not** an offline write queue.
- Completion sends only `{answers}` with `X-CSRF-Token` and an `Idempotency-Key`.
  Before sending, a per-account record containing that key and exact answers is
  saved and verified in localStorage (no session or CSRF token, XP or coins). If
  storage is blocked, completion is refused rather than making an unsafe retry
  promise. Records can contain user-written notes, so protect/clear site storage
  according to the device's privacy policy.
- If a response is lost or ambiguous, the user sees a recovery screen and explicitly
  retries the same request, even after a reload or account switch. The record is not
  an automatic queue. An idempotent replay returns the original result; the app
  refreshes bootstrap before showing current totals so a newer projection is not
  overwritten by the replay. If a proxy strips the `Idempotent-Replay` header and a
  refresh fails, the confirmed entry is shown but its possibly stale projection is
  not used as current totals. If browser storage is cleared or the recovery record is
  corrupt, check server history before starting another run. Do not assume an
  unanswered request failed. On the first attempt, only recognized pre-commit BFF
  validation errors clear the record; unknown proxy errors stay ambiguous. Because
  the backend validates before idempotency lookup, even a rejected *retry* does not
  prove an earlier attempt failed; the record is retained for investigation. A
  `409 IDEMPOTENCY_KEY_REUSED` also needs investigation.
- A single in-flight request can be retried safely, but the backend contract has no
  shared run identifier/optimistic draft revision. Simultaneous independent attempts
  for the same mission in separate tabs/devices may be treated as separate runs;
  avoid concurrent editing until the backend has a cross-tab/run coordination rule.
- The app refreshes bootstrap on focus, reconnect and periodically. It checks the
  account identity before accepting refreshed data. If another tab changes accounts
  while answers are unsaved, those answers stay visible; reauthenticate as the
  original visitor in another tab and retry without closing the mission screen.
- The daily mission, streak comparisons and server history grouping use the BFF's
  UTC `date_key`. The displayed countdown uses the returned server time and does not
  roll to a new day without a fresh server response. Device-only mode retains its
  original local-calendar behavior.
- Sign-out is explicit and server-confirmed: the profile screen calls the CSRF-checked
  `/logout` route and then reopens the visitor picker. **Change demo account** only
  reopens the picker and leaves the cookie alone; switching to the device-only game
  never logs out. A pending completion retry record is per account and survives
  sign-out, so signing back in as the same visitor can still recover it.
- The demo store is device-only for now. Server mode reads no local purchase state and
  uploads none; it renders the store as not connected. Wiring it up requires
  `GET /api/v1/game/store` (offers and prices) and `POST /api/v1/game/store/purchases`
  (server-authorized purchase and entitlement), then replacing the `StoreView` that
  `ServerGameContext` supplies. Until then, no local purchase may be presented as
  trusted or server-confirmed.
- History uses the paginated `/history` endpoint. Totals computed from history pages
  are labelled partial while more pages remain (or the history request failed);
  mission counts come from the server's mission records.

## Deployment and security

A static Vercel deployment using the checked-in `vercel.json` serves the device-only
app but does **not** connect it to a backend. Configure a same-origin HTTPS reverse
proxy before enabling server mode. Route `/api/v1/game/*` to the compatible backend,
preserve its Set-Cookie, and route the frontend assets to the static app. The
prototype's JSON demo routes are dev/test-only, so a production deployment configured
this way will offer the picker and then explain that demo sign-in is disabled. Never cache personalized API/login responses at a CDN or proxy;
the app's service worker also explicitly bypasses them. Do not hard-code a remote
backend or session in browser code. The current prototype's cookie is HttpOnly and
SameSite=Lax but is **not marked Secure** by the backend; add Secure at the backend or
trusted HTTPS proxy before any secure deployment. Configure all other cookie, access
control, CSRF, secret management and proxy headers appropriately.

Do not deploy the demo-user picker to public production: the backend allows anyone
who can reach it to choose a demo account. Put this prototype behind access controls
for development/testing and replace or disable demo login before public release.

## Tests

```bash
npm test
npm run build
# Install Playwright Chromium once, or set SQA_CHROMIUM_PATH to an installed binary.
SQA_BACKEND_DIR=../comu-center SQA_BACKEND_PYTHON=../comu-center/.venv/bin/python npm run test:bff
npm run test:pwa
```

`test:bff` starts the real backend and Vite proxy on temporary ports using a fresh
SQLite database in the OS temporary directory, then removes it. It covers JSON
unauthenticated bootstrap, cookie login, profile, six missions, UTC day, draft
failure/retry and reload, account changes, a mid-session incompatible contract,
loss of a completion response and an idempotent retry after reload, stale and fresh
projections after replay, paginated history, explicit offline fallback, and
preservation of the old local save. It does not
connect to or modify a deployed backend. The backend's own tests remain necessary
for authorization, server-side scoring and separation from organizational points.
