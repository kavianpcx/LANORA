# LANORA alpha.2 QA and review record

Baseline: published `v0.3.0-alpha.1`; reviewed branch `release/0.2.x` at `82a37a00061ee0be89ad0529ff6836c6c71972ff`.

| ID | Category | Finding | Priority | Change | Evidence |
| --- | --- | --- | --- | --- | --- |
| UI-01 | Update/interaction | Clicking an information toast invoked `installUpdate()` and could start install without a distinct Install click | High | Open details only; localize View update details | Source inspection; repository guard; CI/manual UX pending |
| NET-01 | Peer status | `cost != Local` accepted `Unknown` and `Offline` EasyTier peer rows as reachable | Medium | Count only `Direct` or `Relay` route rows | Rust test fixtures added; CI pending |
| DOC-01 | README/design | README displayed the logo but no desktop view | Low | Embed existing Linux native screenshot and provenance in EN/FA | Path check added; browser presentation pending |
| DOC-02 | Roadmap | Roadmap still marked alpha.8 as latest published release | Low | Correct to alpha.1 and label alpha.2 candidate | Documentation review |

## Test execution and boundaries

- Reviewed released tag, branch, update UI, native status parser, CI workflow, architecture and existing test suites.
- Full `npm test`, `cargo test`, Go race tests, Docker deployment, Windows/Linux package builds and GUI validation were not executed in this review environment. GitHub Actions must run these on the PR before merging.
- The release-branch workflow automatically creates a signed prerelease after a successful push, and will refuse to reuse an existing tag. Do not merge without checking required CI, and do not claim a release until GitHub shows published artifacts.
- Two real Windows machines, public ISP/VPS, NAT/P2P, real-game packets, update signature rejection and installed-version update/relaunch remain unverified.
- The screenshot is from an earlier Linux alpha; Windows and later revisions may differ.
- API policy rotation cannot forcibly disconnect a modified client with a previously disclosed EasyTier key.
