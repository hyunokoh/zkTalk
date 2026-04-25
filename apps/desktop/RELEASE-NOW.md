# Shipping the desktop app right now

This is the practical "how do I get a working build into someone's
hands today" guide. For the long-form release process see
[RELEASE.md](RELEASE.md).

## TL;DR — local unsigned build (works today, no certs needed)

```bash
# From repo root
cd apps/web && pnpm build              # builds Next.js standalone
cd ../desktop
CSC_IDENTITY_AUTO_DISCOVERY=false npm run pack:mac
# → apps/desktop/dist/mac-arm64/zkTalk.app
```

For an actual `.dmg` installer (still unsigned):

```bash
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:mac
# → apps/desktop/dist/zkTalk-mac-arm64-<version>.dmg
```

Windows targets (cross-build from macOS works for the unsigned case):

```bash
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:win:x64
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:win:arm64
```

The unsigned build is fine for internal testing or sideloading. macOS
will warn the user the first time they open it (right-click → Open to
bypass Gatekeeper). Windows SmartScreen will show a "Don't run / More
info → Run anyway" prompt.

## Going signed (what you actually have to procure)

The pipeline is fully scripted — `npm run release:status` reports
exactly what's missing. As of today both platforms are blocked on
credentials I cannot generate locally:

### macOS (Apple Developer Program — $99/yr)

You need:

1. An **Apple Developer Program** membership (apple.com/developer).
2. A **Developer ID Application** certificate (created in
   Apple Developer → Certificates).
3. An **App-Specific Password** for `notarytool`
   (appleid.apple.com → Sign-In and Security → App-Specific Passwords).
4. Your **Team ID** (Apple Developer → Membership Details).

Then:

```bash
cp SIGNING.example.env signing.env
# Fill in APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID
npm run release:check       # tells you what's still missing
npm run dist:mac            # signs + notarises + staples
```

### Windows (code-signing certificate — varies by issuer)

You need a code-signing certificate from Sectigo / DigiCert / GlobalSign
(~$200–400/yr for OV, more for EV). Export as `.p12`/`.pfx`, then:

```bash
echo "WIN_CSC_LINK=/abs/path/to/cert.p12" >> signing.env
echo "WIN_CSC_KEY_PASSWORD=…"             >> signing.env
npm run dist:win:x64
npm run dist:win:arm64
```

EV certs additionally require a hardware token; `WIN_CSC_LINK` then
points to the token's PKCS#11 module.

## What's in this build

- The full web bundle is packed into `Resources/web/standalone/` and
  served by an in-process Next.js standalone server.
- The Electron main process exposes the local-machine bridge over
  `ipcRenderer`, so AI agents (codex / claude) running on the user's
  Mac can be driven from the chat UI.
- Custom URL scheme: `zktalk://…` is registered for protocol handling.
- New: the web bundle includes `/settings/api-keys` so users can issue
  public-API keys directly from the desktop app — useful for hooking
  AI agents into their own zkTalk account. See
  [`docs/public-api.md`](../../docs/public-api.md).

## Sanity check after building

```bash
open dist/mac-arm64/zkTalk.app   # or just double-click in Finder
```

Verify:

- App opens to the login screen.
- Magic-link / OAuth login works (the API URL it talks to is set in
  `desktop.config.json` → `apiUrl`).
- After login, the home page renders with the left rail.
- `/settings/api-keys` lists existing keys and lets you create a new one.
- Quit and re-open — window position should be remembered
  (`window-state.js`).
