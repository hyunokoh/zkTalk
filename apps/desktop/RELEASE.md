# zkTalk Desktop Release Notes

Related docs:

- `/Users/hyunokoh/Documents/Projects/zkTalk/docs/README.md`
- `/Users/hyunokoh/Documents/Projects/zkTalk/docs/CURRENT_STATUS.md`
- `/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-release-next.md`
- `/Users/hyunokoh/Documents/Projects/zkTalk/HANDOFF.md`
- `/Users/hyunokoh/Documents/Projects/zkTalk/docs/test-matrix-2026-03-25.md`
- `/Users/hyunokoh/Documents/Projects/zkTalk/docs/release-readiness-checklist-2026-03-25.md`
- `/Users/hyunokoh/Documents/Projects/zkTalk/docs/current-blockers-2026-03-25.md`

Source-of-truth rule:

- Use `docs/README.md` when the current authority document is unclear.
- Use `docs/current-release-next.md` and `docs/current-release-next.json` for the latest repo-level release snapshot.
- Keep credential/device blockers in `docs/current-blockers-2026-03-25.md`.
- Keep code-fixable runtime or regression work in `docs/production-runtime-runbook.md`, `docs/COMMERCIALIZATION_PLAN.md`, and `docs/IMPLEMENTATION_PLAN.md`.

## Local development

Run the Electron shell against a freshly built standalone web bundle:

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop
npm start
```

Run the Electron shell against an already-running web server:

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop
npm run start:devserver
```

Desktop runtime settings live in `desktop.config.json`.

The desktop config now also carries `localAgentLanguagePreset` for the desktop-first local Codex bridge. Use one of:

- `manual_only`
- `english_only`
- `korean_preferred_english_readable`

The app can also open this file from:

- `Help > Connection settings`
- `Help > Open desktop config`

## Build outputs

Unpacked app bundles:

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop
npm run pack:mac
npm run pack:win:x64
npm run pack:win:arm64
```

Installer artifacts:

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop
npm run dist:mac
npm run dist:win:x64
npm run dist:win:arm64
```

Current output locations:

- mac app bundle: `dist/mac-arm64/zkTalk.app`
- mac installer: `dist/zkTalk-mac-arm64-0.0.1.dmg`
- Windows x64 unpacked: `dist/win-unpacked/zkTalk.exe`
- Windows x64 installer: `dist/zkTalk-win-x64-0.0.1.exe`
- Windows arm64 unpacked: `dist/win-arm64-unpacked/zkTalk.exe`
- Windows arm64 installer: `dist/zkTalk-win-arm64-0.0.1.exe`

Installer and blockmap naming is controlled by `artifactName=zkTalk-${os}-${arch}-${version}.${ext}` in `apps/desktop/package.json`.
Use dist/release-manifest.json as the source of truth for the current installer and blockmap set instead of relying on a static file list.
The manifest currently collects .dmg, .exe, and .blockmap outputs from dist/.

## Release preflight

Fastest current signing-readiness path:

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop
npm run release:next
```

Machine-readable output:

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop
npm run release:next -- --json
```

If you want the underlying files too:

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop
npm run release:signing-blockers
cat dist/signing-blockers.md
```

Current blocker report:

- `dist/signing-blockers.md`
- `dist/signing-blockers.json`
- `dist/release-next.json`
- `npm run release:next` prints the current readiness, blockers, next steps, and report paths in one command

Once real credentials are available, the shortest happy path is:

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop
npm run release:init-signing
npm run release:check:signed
npm run release:signed
```

If you keep signing secrets outside the repo, override the env path explicitly:

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop
ZKTALK_SIGNING_ENV_PATH=/absolute/path/to/signing.env npm run release:check:signed
```

Check whether signing and notarization secrets are ready:

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop
npm run release:check
npm run release:check:signed
npm run release:status
npm run release:signing-blockers
npm run release:summary
npm run release:manifest
npm run release:checksums
npm run release:verify
npm run release:report
npm run release:handoff
npm run release:index
npm run release:bundle
npm run release:verify:bundle
npm run release:archive
npm run release:verify:archive
npm run release:verification
```

For an unsigned handoff build, you can also run everything in one go:

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop
npm run release:unsigned
```

That orchestration now does an initial bundle/archive pass, runs verification, then refreshes the final summary, report, index, bundle, and archive so the shipped metadata all reflects the latest verification results.

The unsigned handoff flow is the correct operator path when signing credentials or devices are still unavailable.
Missing `signing.env`, Apple notarization credentials, Windows certificates, or a local signing identity are external input blockers, not reasons to reopen desktop packaging code by default.

To rebuild every installer first and then regenerate all release metadata:

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop
npm run release:refresh
```

To run the same flow with values loaded from `signing.env`:

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop
npm run release:init-signing
npm run release:check:signed
npm run release:signed
```

If only one platform is ready to sign, you can run a targeted signed build:

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop
npm run release:signed:mac
npm run release:signed:win:x64
npm run release:signed:win:arm64
```

This checks for:

- mac signing identity
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`
- `WIN_CSC_LINK` or `CSC_LINK`
- `WIN_CSC_KEY_PASSWORD` or `CSC_KEY_PASSWORD`

If a Windows certificate path is set but the file does not exist, release checks will report `INVALID_PATH`.

It also lets you generate:

- `dist/release-manifest.json` with installer hashes
- `dist/release-status.json` with machine-readable readiness data
- `dist/signing-blockers.md` with a shareable signing blocker summary
- `dist/signing-blockers.json` with machine-readable signing blocker data
- `dist/release-summary.json` with combined readiness, blocker, and installer data
- `dist/SHA256SUMS.txt` for download verification
- `npm run release:verify` to re-check the dist artifacts against `SHA256SUMS.txt`
- `dist/release-report.md` with a human-readable readiness summary
- `dist/release-handoff.md` with a shareable release handoff summary
- `dist/release-handoff.json` with machine-readable release handoff data
- `dist/release-handoff.html` with a browser-friendly release handoff page
- `dist/release-verification.md` with dist/bundle/archive verification results
- `dist/release-verification.json` with machine-readable verification results
- `dist/release-verification.html` with a shareable verification summary page
- `dist/release-index.html` as a local clickable artifact index
- `dist/release-bundle/` with installers and release docs collected together
- `npm run release:verify:bundle` to verify the bundle contents after copying
- `dist/zkTalk-desktop-release-bundle.tar.gz` as a single handoff archive
- `npm run release:verify:archive` to verify the archive contents after compression

dist/release-bundle/ currently contains:

- installer artifacts and blockmaps copied from `dist/release-manifest.json`
- `release-manifest.json`
- `release-status.json`
- `signing-blockers.md`
- `signing-blockers.json`
- `release-summary.json`
- `SHA256SUMS.txt`
- `release-report.md`
- `release-handoff.md`
- `release-handoff.json`
- `release-handoff.html`
- `release-verification.md`
- `release-verification.json`
- `release-verification.html`
- `release-index.html`
- `RELEASE.md`
- `README.txt`

`signing-blockers.md` and `signing-blockers.json` now refresh from the latest `release-status.json`, show whether `signing.env` exists/loaded, and switch the recommended primary command back to `npm run release:init-signing` if the env file exists but did not load.
`release-summary.json`, `release-report.md`, `release-handoff.*`, `release-index.html`, and `release-bundle/` now also refresh their signing/readiness inputs on each run so they do not silently package stale blocker data.
`release-report.md`, `release-handoff.*`, and `release-index.html` now show both the document generation time and the artifact manifest generation time so stale-looking timestamps are easier to interpret.

## mac signing and notarization

The desktop package is already configured for:

- hardened runtime
- entitlements
- `afterSign` notarization hook

Files:

- `build/entitlements.mac.plist`
- `build/entitlements.mac.inherit.plist`
- `scripts/notarize.cjs`
- `SIGNING.example.env`

To enable notarization, export:

```bash
export APPLE_ID="you@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="TEAMID1234"
```

You also need a valid `Developer ID Application` certificate installed in Keychain.

## Windows signing

Windows installer signing is handled by `electron-builder`.

Provide either the Windows-prefixed or generic variables:

```bash
export WIN_CSC_LINK="/absolute/path/to/certificate.p12"
export WIN_CSC_KEY_PASSWORD="password"
```

or

```bash
export CSC_LINK="/absolute/path/to/certificate.p12"
export CSC_KEY_PASSWORD="password"
```

You can start from:

```bash
cp /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop/SIGNING.example.env ./signing.env
```

or

```bash
cd /Users/hyunokoh/Documents/Projects/zkTalk/apps/desktop
npm run release:init-signing
```

## Support and diagnostics

The desktop app exposes:

- `Help > Diagnostics`
- `Help > Open desktop logs`
- `Help > Open app data folder`
- `Help > Export support bundle`

Support bundle JSON files are written under:

```text
~/Library/Application Support/zkTalk/support
```

Desktop logs are written under:

```text
~/Library/Application Support/zkTalk/logs/desktop.log
```
