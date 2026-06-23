# Changelog

All notable changes to Snag are documented here.

## 2026-06-23

### Added

- First-run hosted onboarding flow with endpoint creation, copy URL, send test
  event, and direct console open.
- Console empty state actions for copying the capture URL, sending a test event,
  and clearing filters.
- `@snag/sdk` package metadata and package README in preparation for npm
  publication.
- Reliability and operations documentation.
- Release notes documentation.
- PyPI/`uvx` verification for `snag-mcp@0.1.2`.

### Changed

- Web app, SDK, CLI docs, SDK docs, MCP docs, and provider recipes now treat
  `https://snag-server.fly.dev` as the canonical hosted API.
- Web app fallback config now points to the hosted Vercel/Fly deployment instead
  of localhost.
- SDK zero-config default now points to the hosted API.
- SDK token fallback generation now uses Web Crypto instead of Node-only crypto.

### Blocked

- npm rejected `@snag/sdk@0.1.0` publication because the token does not have
  access to the `@snag` scope. The package is built and smoke-tested from a
  local tarball.

## 2026-06-22

### Fixed

- `snag-cli` now defaults to the hosted API instead of localhost.
- `snag-cli` no longer publishes the private workspace package as a runtime
  dependency.

### Released

- Published `snag-cli@0.0.4` to npm with hosted defaults and package metadata.
