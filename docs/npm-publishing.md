# Publishing HypoStage to NPM

This guide covers publishing `@archhypo/plugin-hypo-stage` and `@archhypo/plugin-hypo-stage-backend` to the NPM registry. `@archhypo/plugin-hypo-stage-backend-agents` is optional and versioned separately. A core release tag does not have to match it. The workflow publishes the agents package only when its own `package.json` version equals the tag, and a mismatch skips that publish instead of failing the core release.

**Current line:** The project uses **`1.x`** releases on npm from **v1.0.0** onward (first stable 1.x baseline). Document user-facing changes in the root [`CHANGELOG.md`](../CHANGELOG.md) when you cut a release.

---

## Version management (SemVer)

HypoStage follows **Semantic Versioning** (`X.Y.Z`), an industry standard for version numbers. See:

- [Semantic Versioning 2.0.0](https://semver.org/) — official specification
- [npm: About semantic versioning](https://docs.npmjs.com/about-semantic-versioning) — how npm interprets versions

### Format: MAJOR.MINOR.PATCH

| Component | When to increment | Example |
|-----------|-------------------|---------|
| **MAJOR (X)** | Breaking, incompatible API changes | `1.0.0` → `2.0.0` |
| **MINOR (Y)** | New features, backward compatible | `1.0.0` → `1.1.0` |
| **PATCH (Z)** | Bug fixes, backward compatible | `1.0.0` → `1.0.1` |

### During initial development (0.y.z)

Before `1.0.0`, treat the API as unstable. From **`1.0.0`**, follow SemVer for the public plugin API and published packages; increment **MAJOR** for incompatible changes (for example, required `app-config` shape or breaking REST contract changes).

### Pre-release (optional)

For alpha/beta releases: `1.0.0-alpha.1`, `1.0.0-beta.2`. The publish workflow supports tags like `v1.0.0-alpha.1`; ensure both `package.json` files use the same version string.

---

## Automated publishing (GitHub Actions)

Pushing a version tag triggers automatic publishing via [`.github/workflows/publish-npm.yml`](../.github/workflows/publish-npm.yml).

### Setup (one-time)

1. **Create an NPM automation token**
   - Go to [npmjs.com](https://www.npmjs.com) → Account → **Access Tokens**
   - **Generate New Token** → **Granular Access Token** (recommended) or **Automation**
   - Granular: select **Packages and scopes** → **Read and write** for `@archhypo`
   - Automation tokens bypass 2FA and are designed for CI
   - Copy the token (you won't see it again)

2. **Add secret to GitHub**
   - Repo → **Settings** → **Secrets and variables** → **Actions**
   - **New repository secret** → name: `NPM_TOKEN`, value: your token

---

### Release steps (publishing a new version)

Follow these steps exactly. The tag **must** match the version in the frontend and backend `package.json` files (e.g. tag `v1.0.2` requires `"version": "1.0.2"` in both).

**1. Update version** in both core `package.json` files to the new semver (e.g. `1.0.2`):

- `hypo-stage/package.json` → `"version": "1.0.2"`
- `hypo-stage-backend/package.json` → `"version": "1.0.2"`

Both must have the **exact same** version string. The workflow will fail if they differ or don't match the tag.

#### Why the agents package publishes only when its version matches the tag

The frontend and the backend are released together. The agents module is a third package with its own version (`hypo-stage-backend-agents/package.json`, currently `1.0.0` while the core packages are `1.0.1`). Two npm rules make a single "always publish agents" step unsafe:

- npm refuses to publish a version that is already on the registry. Republishing `1.0.0` on every later core tag would fail.
- A failed `npm publish` fails the GitHub job. If that happened after the frontend and backend had already published, the core release would be left half-finished.

The workflow therefore:

1. **Requires** the frontend and backend versions to equal the tag. A mismatch stops the job before anything is published.
2. **Publishes** those two packages.
3. **Publishes** `@archhypo/plugin-hypo-stage-backend-agents` only when its version equals the same tag. If it does not, the step prints a skip message and exits 0. The core release still succeeds.

To ship a new agents build, set all three `package.json` versions to the tag. Example: tag `v1.1.0` with `1.1.0` in the frontend, the backend, and `hypo-stage-backend-agents`. A core-only fix can leave the agents version where it is.

**2. Commit, push, open PR, and merge**

Because `main` is protected, merge the version bump via a pull request:

```bash
NEW_VERSION="0.1.1"

git checkout -b "release-v$NEW_VERSION"
git add hypo-stage/package.json hypo-stage-backend/package.json
git commit -m "chore: release v$NEW_VERSION"
git push origin "release-v$NEW_VERSION"
```

Open a PR, get it approved, merge to `main`.

**3. Create a GitHub Release** (after the PR is merged)

Using the GitHub web interface creates a tag and triggers the publish workflow:

1. Open the repo on GitHub → **Releases** (sidebar or `/releases`)
2. Click **Create a new release**
3. **Choose a tag** → **Create new tag** on publish → enter `v0.1.1` (replace with your version)
4. **Target** → select `main` (ensure the merged PR is on main)
5. **Release title** → e.g. `v0.1.1` or `Release v0.1.1`
6. **Description** → optional; add a changelog or leave blank
7. Click **Publish release**

Publishing the release creates the tag and triggers the NPM publish workflow.

**4. Monitor the workflow**

- Go to **Actions** in the repo
- The "Publish to NPM" workflow runs automatically
- It validates the frontend and backend versions, builds, tests, and lints every workspace (including the agents module), runs the plugin and agents migrations and demo seeds against PostgreSQL, then publishes the two core packages. It publishes the agents package only when its version equals the tag

**Tag format:** Use `v` + semver (e.g. `v0.1.1`, `v1.0.0`). The workflow strips the `v` and checks it matches both `package.json` versions.

#### Quick summary (replace `0.1.1` with your version)

1. Edit `hypo-stage/package.json` and `hypo-stage-backend/package.json` → `"version": "0.1.1"`
2. Branch, commit, push, open PR, merge to `main` (see step 2 above)
3. After merge: **Releases** → **Create a new release** → create tag `v0.1.1` from `main` → **Publish release**

---

### Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Workflow fails: "Version mismatch" | Tag doesn't match the frontend or backend `package.json` | Ensure tag `vX.Y.Z` equals `"version": "X.Y.Z"` in both core package.json files. The agents version is not part of this check |
| Agents package was not published | Its version differs from the tag | Expected for a core-only release. Bump `hypo-stage-backend-agents/package.json` to the tag version and release again when that module should ship |
| Workflow fails: "ENEEDAUTH" | Missing or invalid NPM_TOKEN | Add NPM_TOKEN secret; use Automation or Granular token with publish rights |
| Workflow fails: "403 Forbidden" | Token lacks publish scope | Create token with **Read and write** for `@archhypo` packages |

---

## Manual publishing

If you need to publish locally:

1. **Build first**
   ```bash
   yarn build
   ```

2. **Publish backend, then frontend.** Publish the agents package only when you intend to ship that version (the same rule as CI: do not republish a version npm already has).
   ```bash
   cd hypo-stage-backend && npm publish --access public
   cd ../hypo-stage && npm publish --access public
   cd ../hypo-stage-backend-agents && npm publish --access public
   ```

**Note:** NPM requires either two-factor authentication (use `npm publish --otp=CODE`) or an **automation** token. Classic tokens with 2FA enabled will fail; use the GitHub workflow instead.
