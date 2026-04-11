# zkTalk Production Runtime Runbook

Status: active working runbook  
Audience: engineering / deploy owner  
Last updated: 2026-04-07

Use this document for the minimum runtime requirements to run zkTalk web and API as a commercial service. Pair it with:

- [docs/README.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/README.md)
- [docs/COMMERCIALIZATION_PLAN.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/COMMERCIALIZATION_PLAN.md)
- [docs/IMPLEMENTATION_PLAN.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/IMPLEMENTATION_PLAN.md)
- [docs/ZKCODER_RUNBOOK.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/ZKCODER_RUNBOOK.md)
- [.env.production.example](/Users/hyunokoh/Documents/Projects/zkTalk/.env.production.example)
- [docs/release-readiness-checklist-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/release-readiness-checklist-2026-03-25.md)
- [apps/desktop/RELEASE.md](/Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/RELEASE.md)

Authority boundary:

- runtime and deploy assumptions live here
- concise blocker wording lives in `docs/current-blockers-2026-03-25.md`
- queue ordering and follow-up execution lives in `docs/IMPLEMENTATION_PLAN.md`
- zkCoder invocation rules live in `docs/ZKCODER_RUNBOOK.md`

Classification rule:

- Use this runbook for code-fixable runtime assumptions, deploy contracts, readiness boundaries, and operator checks that engineering can still tighten repo-locally.
- Do not list signing credentials, certificate installation, or real-device-only confirmation here as if they were API/web runtime bugs.
- When a deploy problem is caused by missing secrets, accounts, certificates, or devices rather than repo behavior, keep the blocker wording in `docs/current-blockers-2026-03-25.md` and leave only the runtime dependency contract here.

## 1. Required production services

- PostgreSQL reachable by the API
- Redis reachable by the API and websocket/realtime paths
- S3-compatible object storage for uploads
- LiveKit for voice/video features
- Public HTTPS origin for the web app
- Public HTTPS/WSS API origin

If any of these are unavailable, zkTalk should be treated as degraded or not ready for production traffic.
Only the dependencies needed for baseline API traffic should drive deploy readiness. Feature-specific dependencies should stay documented separately so operators can distinguish "API should not receive traffic" from "a specific feature is degraded."

## 1a. Runtime dependency matrix

| Dependency | Used by | Current readiness contract | Operator expectation | Failure boundary |
| --- | --- | --- | --- | --- |
| PostgreSQL | API persistence, auth, messages | Included in `/api/health/ready` | Must be reachable before deploy promotion | Baseline API traffic is not ready |
| Redis | API realtime/session-adjacent flows | Included in `/api/health/ready` | Must be reachable before deploy promotion | Baseline API traffic is not ready |
| S3-compatible object storage | attachment presign upload, asset fetch/proxy | Not currently probed by `/api/health/ready` | Bucket, credentials, region, and optional endpoint must be verified separately | Attachment upload/download is degraded even if API readiness stays green |
| LiveKit | voice/video token issuance and room join | Not currently probed by `/api/health/ready` | URL and API credentials must be verified separately | Voice/video join fails while baseline API traffic may remain ready |
| AI provider | summarize/chat routes | Not currently probed by `/api/health/ready` | `AI_PROVIDER` and the matching provider-specific key env must be verified separately | AI summarize/chat fails while baseline API traffic may remain ready |

Use this matrix during deploys and handoff reviews. A green readiness result only means the API process plus required baseline dependencies are ready; it is not a blanket signal for attachments or voice.
The `/api/health` and `/api/health/ready` responses now also expose `operator.trafficGate` so operators can tell whether traffic should still be blocked, even before scanning the rest of the payload.
The same responses now expose `operator.immediateActions`, which gives the minimum next-step checklist directly in the payload: liveness tells the operator to confirm readiness before routing traffic, a green readiness response reminds the operator to run excluded feature gates, and a red readiness response tells the operator to keep traffic blocked and re-run the readiness check after recovery.
The `/api/health/ready` response still mirrors the readiness boundary explicitly through `boundary.checkedDependencies` and `boundary.excludedDependencies` so operators can see the excluded feature dependencies in the API output itself.
API startup now also emits a single structured `startup_summary` log entry with the listen address, log level, dependency targets, readiness-required dependencies, excluded feature boundaries, and AI runtime status so deploy owners can confirm the boot contract quickly.

### 1b. Feature dependency operator gates

Use these checks when the question is "are uploads ready?" or "is voice ready?" rather than "is the API process ready?"

Object storage gate:

1. Verify `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION`, and optional `S3_ENDPOINT` are explicitly set for the target deploy.
2. Inspect `docker compose -f docker/docker-compose.prod.yml config` and confirm those values are not placeholders.
3. Confirm `/api/health/ready` still lists object storage under `boundary.excludedDependencies`.
4. Run a presign upload plus public asset retrieval path before calling the environment ready for attachments.

Voice / LiveKit gate:

1. Verify `NEXT_PUBLIC_LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` are explicitly set for the target deploy.
2. Inspect `docker compose -f docker/docker-compose.prod.yml config` and confirm those values are not placeholders or localhost browser URLs.
3. Confirm `/api/health/ready` still lists LiveKit under `boundary.excludedDependencies`.
4. Run token issuance plus an actual room join before calling the environment ready for voice/video.

Operator rule:

- a green `/api/health/ready` result without these extra checks is not sufficient evidence for attachment or voice readiness
- if the repo-local release-readiness batch passes and only these feature-specific gates fail, keep the issue in operator/blocker docs unless the failure traces back to a reproducible code defect

## 2. Required production environment

These values should be explicitly set in production, either directly in the runtime process env or indirectly through the compose inputs that create those runtime values. Do not rely on localhost defaults.

### Effective API runtime values

These are the values the running API process expects to have when `NODE_ENV=production`.

- `DATABASE_URL`
- `REDIS_URL`
- `CORS_ORIGIN`
- `COOKIE_SECRET`
- `MAGIC_LINK_SECRET`
- `EMAIL_LINK_SECRET`
- `PORT`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_BUCKET`
- `S3_REGION`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

### Compose input values for `docker/docker-compose.prod.yml`

If production is launched through [`docker/docker-compose.prod.yml`](/Users/hyunokoh/Documents/Projects/zkTalk/docker/docker-compose.prod.yml), operators set these source values in `.env.production` and compose derives some effective runtime env from them:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `CORS_ORIGIN`
- `COOKIE_SECRET`
- `MAGIC_LINK_SECRET`
- `EMAIL_LINK_SECRET`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_BUCKET`
- `S3_REGION`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`
- `NEXT_PUBLIC_LIVEKIT_URL`

Compose-specific notes:

- the API container gets `DATABASE_URL` from `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`
- the API container gets `REDIS_URL=redis://redis:6379` from the compose file, not from `.env.production`
- the API container runs with `PORT=4000` inside the container; `.env.production` `PORT` controls the public nginx listener port on the host

### Compose placeholder boundary

[`docker/docker-compose.prod.yml`](/Users/hyunokoh/Documents/Projects/zkTalk/docker/docker-compose.prod.yml) still contains fallback defaults for several API-facing settings so the stack can render in local and unsigned handoff contexts. Operators must not mistake those defaults for production-safe values.

Current compose placeholders or development defaults that still require explicit replacement before promotion:

- `COOKIE_SECRET=${COOKIE_SECRET:-change-this-in-production}`
- `MAGIC_LINK_SECRET=${MAGIC_LINK_SECRET:-change-this-in-production}`
- `EMAIL_LINK_SECRET=${EMAIL_LINK_SECRET:-change-this-in-production}`
- `LIVEKIT_API_KEY=${LIVEKIT_API_KEY:-devkey}`
- `LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET:-secret}`
- `S3_ACCESS_KEY=${S3_ACCESS_KEY:-minioadmin}`
- `S3_SECRET_KEY=${S3_SECRET_KEY:-minioadmin}`
- `NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost/api}`
- `NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL:-ws://localhost/api/ws}`
- `NEXT_PUBLIC_LIVEKIT_URL=${NEXT_PUBLIC_LIVEKIT_URL:-ws://localhost:7881}`

This means:

- a rendered compose config can still look syntactically complete while remaining unfit for production
- `/api/health` and `/api/health/ready` do not detect placeholder secrets or browser-facing localhost URLs
- deploy owners must treat placeholder-value removal as a separate operator gate before traffic promotion

### Effective API runtime, required when not using AWS-managed S3

- `S3_ENDPOINT`

The API no longer substitutes `http://localhost:9000` in production when `S3_ENDPOINT` is missing. Leaving it unset is valid only for AWS-managed S3-style deployments that rely on the SDK default endpoint resolution.
When `S3_ENDPOINT` is set, the API now validates it as an absolute `http`/`https` origin without path, query, or hash segments so deploys fail before attachment traffic hits a malformed object-storage target.

### Web build/runtime

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`
- `NEXT_PUBLIC_LIVEKIT_URL`

### Desktop local machine bridge boundary

The first local machine agent bridge is a desktop-first operator path, not a general cloud execution feature.

- Source of truth: [docs/local-machine-bridge-trust-model-2026-04-10.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/local-machine-bridge-trust-model-2026-04-10.md)
- Execution boundary: only the addressed target machine's local bridge may use that machine's local Codex auth/session
- Server boundary: zkTalk authenticates the owning user, stores machine metadata, routes machine-scoped envelopes, and persists status/results; it must not proxy or mint a reusable Codex session
- Client boundary: web and mobile may show machine presence, command history, and command results, but they must degrade to non-executing surfaces until an explicit wider bridge path ships

Operator rule:

- Do not claim browser-only or mobile-only local Codex execution for the current release candidate.
- Treat `offline`, `busy`, `auth_missing`, `bridge_missing`, and `rejected` as explicit operator-observable states, not as generic retry copy.
- If a target machine lacks a live desktop bridge or local Codex auth, keep the issue in engineering/runtime follow-up unless the missing piece is an external machine setup task outside this repo.

Repo-local verification anchor:

- `packages/shared/src/__tests__/local-machine-bridge.test.ts`
- `apps/web/src/lib/__tests__/local-machine-dispatch.test.ts`
- `apps/web/src/lib/__tests__/local-machine-command-copy.test.ts`
- `.zkcoder/scripts/verify.sh`

Logging boundary:

- web-side development logging is suppressed by default when `NODE_ENV=production`
- the only intended production exceptions are explicit operator/debug contexts such as `/desktop-harness` or a manual `?debugLogs=1` opt-in that is immediately scrubbed from the URL and retained only for the current browser session
- `?debugLogs=0` or `?debugLogs=false` clears that session-scoped browser override again
- treat any new production browser logging outside those boundaries as a regression against the handoff goal of keeping developer noise out of user-facing flows

### Optional but recommended

- `HOST`
- `LOG_LEVEL`
- `MAGIC_LINK_EXPIRY_MINUTES`
- `AI_PROVIDER`
- `AI_API_KEY`
- `OPENROUTER_API_KEY`
- `OPENROUTER_SITE_URL`
- `ZKTALK_PUBLIC_APP_URL`
- `GEMINI_API_KEY`
- `TRANSLATION_API_KEY`
- `GOOGLE_CLIENT_ID`
- `APPLE_CLIENT_ID`

## 2a. Public origin contract

These values must describe the same externally reachable deployment rather than a mix of internal and public hosts.

| Setting | Expected value | Notes |
| --- | --- | --- |
| `CORS_ORIGIN` | exact browser origin such as `https://chat.example.com` | comma-separate only when multiple browser origins are intentionally allowed |
| `NEXT_PUBLIC_API_URL` | public `http`/`https` API base such as `https://chat.example.com/api` | no trailing slash; web code concatenates route paths directly |
| `NEXT_PUBLIC_WS_URL` | public `ws`/`wss` websocket endpoint such as `wss://chat.example.com/api/ws` | should point to the realtime route, not just the site origin |
| `NEXT_PUBLIC_LIVEKIT_URL` | public `ws`/`wss` LiveKit URL such as `wss://livekit.example.com` | should be reachable from browsers, not just from the API container |
| `ZKTALK_PUBLIC_APP_URL` | canonical public app origin such as `https://chat.example.com` | used for provider-facing links and should stay off loopback in production |
| `OPENROUTER_SITE_URL` | same public app origin when using OpenRouter referer metadata | loopback-only values are intentionally ignored |

Origin rules:

- `CORS_ORIGIN` must list the browser-visible web origin, not an internal container hostname
- do not point `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_WS_URL` at `api:4000`; those values are embedded into the web build and must be browser-reachable
- keep same-origin browser deployments aligned so cookie-backed auth works without bearer fallback
- if a production-like loopback origin is required for manual operator testing, add it explicitly to `CORS_ORIGIN`

## 3. Fail-closed rules

The following must block a production deploy or startup:

- `COOKIE_SECRET` missing or set to a development placeholder
- `EMAIL_LINK_SECRET` missing or reusing a development placeholder
- `PORT` missing in a direct production API runtime that does not inject its own container port
- `NEXT_PUBLIC_API_URL` missing in a production web build
- `NEXT_PUBLIC_WS_URL` missing in a production web build
- LiveKit secrets missing when voice/video is enabled
- object storage credentials missing when attachments are enabled

Current code already hard-fails `COOKIE_SECRET`, `EMAIL_LINK_SECRET`, and direct-runtime `PORT` in production-oriented API startup/auth paths, and production web config rejects missing public API/WebSocket URLs.
The public asset proxy also now fails closed when `ZKTALK_API_URL` or `NEXT_PUBLIC_API_URL` is missing, relative, or not using `http`/`https`, instead of reporting that condition as a generic upstream outage. Misconfiguration responses now carry `x-zktalk-proxy-error=misconfigured`, a concrete `x-zktalk-proxy-detail`, and `cache-control: no-store` so operators can distinguish deploy mistakes from transient fetch failures.
AI chat and summarize routes now only use explicit runtime configuration: set `AI_PROVIDER` to `openrouter`, `anthropic`, `gemini`, or `mock`, then provide the matching provider-specific key env. They no longer infer a provider from whichever key happens to be present, they no longer reuse `OPENAI_API_KEY` as an OpenRouter fallback, and they ignore loopback-only OpenRouter referer origins.
API startup summary now records `dependencyTargets.ai_provider` with one of `configured`, `mock`, `disabled`, or `misconfigured`. Treat `disabled` and `misconfigured` as operator follow-up states before promising AI availability, even though baseline `/api/health/ready` can still stay green.
`docker/docker-compose.prod.yml` must pass `EMAIL_LINK_SECRET` into the API container so email-link auth cannot silently fail only after production traffic exercises that path.
Because the compose file still has some placeholder defaults, "fail closed in code" and "safe for operator promotion" are not the same state yet. Treat compose placeholder removal as a documented operator requirement, not as something readiness will prove automatically.

## 4. Remaining development-only runtime exceptions

These behaviors are still present in the codebase for local development or explicit desktop/harness flows. They should not be mistaken for production-safe defaults, but they are also not current external release blockers by themselves:

- [`apps/api/src/lib/env.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/lib/env.ts) still keeps development-only fallback values for local startup outside production.
- [`apps/api/src/modules/ai/ai.service.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/api/src/modules/ai/ai.service.ts) still returns a mock AI summary when no provider is configured outside production.
- [`apps/web/src/lib/api.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/lib/api.ts) and [`apps/web/src/hooks/useWebSocket.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/hooks/useWebSocket.ts) keep bearer/query-token fallback paths only for explicit desktop runtime or desktop harness sessions.
- [`apps/web/src/app/api/public-assets/[...assetPath]/route.ts`](/Users/hyunokoh/Documents/Projects/zkTalk/apps/web/src/app/api/public-assets/[...assetPath]/route.ts) still falls back to `http://127.0.0.1:4000` in non-production development mode.

Operator interpretation:

- production runtime should already fail closed for the higher-risk secrets, localhost service URLs, and missing public API URL cases documented above
- keep these remaining exceptions in the engineering/runtime queue unless they are observed leaking into a production-oriented path
- do not reclassify them as signing/device blockers; they belong with repo-local hardening and targeted verification work

## 5. Deployment assumptions

- Serve the web app and API over HTTPS in production.
- Use `wss://` for realtime traffic.
- Keep `CORS_ORIGIN` aligned to the exact public web origin.
- If loopback browser access is required in a production-like environment, add that loopback origin explicitly to `CORS_ORIGIN`; it is not allowed automatically.
- Treat [`docker/docker-compose.prod.yml`](/Users/hyunokoh/Documents/Projects/zkTalk/docker/docker-compose.prod.yml) as fail-closed for `CORS_ORIGIN`; the stack should not boot with an implicit localhost browser origin.
- Treat `.env.production` `PORT` as the host-facing nginx listener only; it does not replace the API container's internal `PORT=4000`.
- Keep API and web origin configuration consistent so same-origin cookie auth works as intended on the web.
- Do not expose development placeholder secrets in images, compose files, or CI defaults.
- Treat desktop release signing as a separate concern from web/API runtime readiness.
- Treat operator-visible API request logs as sanitized output only; bearer tokens, cookies, webhook tokens, QR status tokens, and token-like query params should not appear in normal server logs.

## 5a. Deterministic local stack contract

Use this contract for repo-local verification, smoke setup, and operator reproduction when the goal is "same machine, same ports, same seeded assumptions."

Canonical bootstrap commands:

- `pnpm local:commercial:stack`
- `pnpm local:commercial:verify`
- `pnpm e2e:smoke:web:core`

The explicit covered journey list for that smallest browser gate lives in [e2e/core-smoke-contract.json](/Users/hyunokoh/Documents/Projects/zkTalk/e2e/core-smoke-contract.json). Update that contract in the same batch whenever the covered journeys or exact spec files change.

These commands currently rely on [`scripts/local-commercial-stack.mjs`](/Users/hyunokoh/Documents/Projects/zkTalk/scripts/local-commercial-stack.mjs), which starts the local dependency stack through [`docker/docker-compose.yml`](/Users/hyunokoh/Documents/Projects/zkTalk/docker/docker-compose.yml), waits for readiness, runs migrations, and ensures the upload bucket exists.

Deterministic local values:

| Dependency | Expected local target | Deterministic assumption |
| --- | --- | --- |
| PostgreSQL | `postgresql://zktalk:zktalk@localhost:5432/zktalk` | API local default and stack bootstrap target |
| Redis | `redis://localhost:6379` | realtime/session local default and stack bootstrap target |
| MinIO / S3 | `http://localhost:9000` with bucket `zktalk-uploads`, region `us-east-1`, access key `minioadmin`, secret key `minioadmin` | attachment presign and asset flows should use this local object-store contract unless explicitly overridden |
| LiveKit | `ws://127.0.0.1:7880` for repo-local smoke expectations | browser-facing local voice join target recorded in release/readiness docs |

Local operator notes:

- `.env.example` is the source-of-truth example for these repo-local defaults.
- `scripts/local-commercial-stack.mjs` currently prints the expected local Postgres, Redis, and MinIO targets after boot so failures are inspectable in terminal logs.
- the deterministic stack script does not currently start LiveKit; treat `ws://127.0.0.1:7880` as a separate local prerequisite for voice-specific smoke or manual validation.
- if Docker is unavailable, or LiveKit is not running on the expected local port, record that as an environment blocker rather than a product regression.

## 6. Pre-deploy check

Before promoting a build, verify:

- production env file or secret manager entries exist for every required variable
- rendered `docker compose -f docker/docker-compose.prod.yml config` output no longer contains placeholder secrets, development credentials, or browser-facing localhost defaults for the target deployment
- `/api/health` responds with `scope: process`; this is liveness only and proves the API process booted
- `/api/health` also includes `runtime`, `operator.readinessScope`, and `operator.trafficGate`; `shouldReceiveTraffic=false` is expected there
- `/api/health/ready` reports `ready` with `scope: required_runtime_dependencies`; today that boundary is database plus Redis
- `/api/health/ready` also returns `runtime`, `summary.failingDependencies`, `operator.trafficGate`, and a `boundary` section that names the checked dependencies and the excluded feature-specific dependencies
- startup logs should contain one `startup_summary` entry showing the listen address plus sanitized database, Redis, and object-storage targets
- database, Redis, object storage, and LiveKit endpoints are reachable from the API runtime
- object storage bucket already exists and the API credentials can read/write it
- if using non-AWS S3, `S3_ENDPOINT` matches the reachable internal API-side URL, not a browser-only public hostname
- if using non-AWS S3, `S3_ENDPOINT` is only the storage origin such as `https://storage.example.com`, not `https://storage.example.com/bucket-name`
- if using AWS-managed S3, `S3_ENDPOINT` is intentionally unset and startup logs show `aws-managed endpoint` instead of a loopback fallback
- web build points to the real production API and websocket origins
- attachment upload/download works against the production object store
- login, logout, session restore, community open, send message, attachment, and voice join are covered by the current smoke matrix or an explicit operator note below
- desktop release credentials are reviewed separately if a desktop release is part of the cut

Readiness boundary notes:

- `/api/health/ready` is intentionally narrow. It should fail deploy readiness when required API traffic dependencies are down.
- `operator.trafficGate.shouldReceiveTraffic=false` on `/api/health` is not an outage by itself; it means the process is up but readiness still decides traffic admission.
- a green `/api/health/ready` response should still show `boundary.excludedDependencies` for object storage and LiveKit; that is expected, not a bug
- object storage and LiveKit are still production dependencies, but they remain outside the current readiness endpoint because this API process does not maintain a universal boot-time connectivity contract for those services.
- treat storage and voice checks as operator pre-deploy and smoke-check requirements until a concrete repo-local probe is added for those integrations.
- treat rendered-compose placeholder checks the same way: they are operator pre-deploy requirements outside the health endpoint contract.

Object storage operator notes:

- presigned uploads can succeed only when bucket, credentials, region, and endpoint settings all line up on the API side
- a healthy web build is not enough for attachments; operators should test both presign creation and final asset retrieval through the app path
- if `/api/health/ready` is green but attachment flows fail, treat that as a storage-specific blocker, not proof that readiness is wrong

Core smoke matrix:

- `pnpm e2e:smoke:web:core`
- this is the canonical repo-local core-path smoke for login, logout, session restore, community open, channel send message, channel attachment send, and seeded voice join state
- use [docs/critical-path-verification-map-2026-04-07.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/critical-path-verification-map-2026-04-07.md) alongside the contract to see which critical paths remain lightly verified after that smoke passes
- it assumes the deterministic local commercialization stack can be started from the repo via `scripts/local-commercial-stack.mjs`
- the voice assertion is intentionally thin: it proves the web join request, participant registration, and connected-state wiring, but it is not a substitute for a real hosted LiveKit media-plane check
- if this command fails because PostgreSQL, Redis, object storage, or Playwright browser dependencies are unavailable locally, treat that as an environment blocker and record it separately from product regressions

## 7. External blockers that still require humans

These are not repo-local verification failures and should stay documented as operator blockers until resolved:

- signing credentials for mac notarization and Windows code signing
- real iPhone validation for Korean IME composition and submit behavior
- production service accounts and reachable hosted dependencies for PostgreSQL, Redis, object storage, and LiveKit

Recommended next actions:

- use `npm run release:next` from the repo root to refresh the current release snapshot and blocker wording
- use [docs/current-blockers-2026-03-25.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-blockers-2026-03-25.md) as the single concise blocker summary
- use [docs/current-release-next.md](/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.md) as the operator-facing release snapshot before editing mission briefs or queue notes
- record the result of the real-device IME check with the checklist and report template once hardware access is available

## 8. Not covered yet

This runbook does not yet define:

- rollback procedure
- outage handling by dependency type
- production monitoring/SLO ownership
- a hosted-production media-plane smoke that proves real LiveKit audio/video transport instead of only the local join handshake

Those should be added as follow-up operations docs, not mixed into local development defaults.
