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

For alpha/beta releases: `1.0.0-alpha.1`, `1.0.0-beta.2`. The publish workflow supports tags like `v1.0.0-alpha.1`. The frontend and backend `package.json` files must use that same version string. Include `hypo-stage-backend-agents/package.json` when this tag should publish the agents module too.

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

The tag **must** match the frontend and backend versions. Tag `v1.1.0` requires `"version": "1.1.0"` in both `hypo-stage/package.json` and `hypo-stage-backend/package.json`. The workflow stops before publishing anything if either one differs.

The agents module (`@archhypo/plugin-hypo-stage-backend-agents`, directory `hypo-stage-backend-agents`) is a third package. It publishes on that same tag only when its own `package.json` version is also `1.1.0`. Choose one of these before you edit versions:

| This tag | Versions to set | What npm receives |
|---|---|---|
| Core only | Frontend and backend = tag. Leave `hypo-stage-backend-agents/package.json` unchanged | Frontend and backend. The agents step prints a skip and exits 0 |
| Core and agents | All three packages = tag | Frontend, backend, and `@archhypo/plugin-hypo-stage-backend-agents` |

Agents cannot ship on its own tag. The workflow still requires the frontend and backend to equal the tag, so the agents version has to move to that same number. Today the core packages are `1.0.1` and the agents package is `1.0.0`. Tagging `v1.0.0` to publish that `1.0.0` would fail the core version check. The first agents publish rides the next core release: set all three to the new version (for example `1.1.0`) and tag `v1.1.0`.

#### Why a core-only tag skips agents instead of failing

npm refuses to publish a version that is already on the registry, and a failed `npm publish` fails the job. Republishing the current agents version on every later core tag would fail after the frontend and backend had already published. The skip keeps a core-only release intact.

The workflow order is:

1. Require the frontend and backend versions to equal the tag.
2. Build, test, and lint every workspace, then run the plugin and agents migrations and demo seeds against PostgreSQL.
3. Publish the backend, then the frontend.
4. Publish `@archhypo/plugin-hypo-stage-backend-agents` when its version equals the tag. Otherwise print the skip message and exit 0.

**1. Update versions**

Core only:

- `hypo-stage/package.json` → `"version": "1.1.0"`
- `hypo-stage-backend/package.json` → `"version": "1.1.0"`
- `hypo-stage-backend-agents/package.json` → leave the current version

Core and agents (this is the release that publishes the agents module):

- `hypo-stage/package.json` → `"version": "1.1.0"`
- `hypo-stage-backend/package.json` → `"version": "1.1.0"`
- `hypo-stage-backend-agents/package.json` → `"version": "1.1.0"`

The frontend and backend strings must match each other and the tag. For an agents release, the agents string must match them too.

**2. Commit, push, open PR, and merge**

Because `main` is protected, merge the version bump via a pull request. Include the agents `package.json` in the commit when you changed it:

```bash
NEW_VERSION="1.1.0"

git checkout -b "release-v$NEW_VERSION"
git add hypo-stage/package.json hypo-stage-backend/package.json
# Only when this tag publishes the agents module:
git add hypo-stage-backend-agents/package.json
git commit -m "chore: release v$NEW_VERSION"
git push origin "release-v$NEW_VERSION"
```

Open a PR, get it approved, merge to `main`.

**3. Create a GitHub Release** (after the PR is merged)

Using the GitHub web interface creates a tag and triggers the publish workflow:

1. Open the repo on GitHub → **Releases** (sidebar or `/releases`)
2. Click **Create a new release**
3. **Choose a tag** → **Create new tag** on publish → enter `v1.1.0` (the version from step 1)
4. **Target** → select `main` (ensure the merged PR is on main)
5. **Release title** → e.g. `v1.1.0` or `Release v1.1.0`
6. **Description** → optional; add a changelog or leave blank
7. Click **Publish release**

Publishing the release creates the tag and triggers the NPM publish workflow.

**4. Monitor the workflow**

- Go to **Actions** in the repo
- The "Publish to NPM" workflow runs automatically
- It validates the frontend and backend versions, builds, tests, and lints every workspace (including the agents module), runs the plugin and agents migrations and demo seeds against PostgreSQL, then publishes the backend and the frontend.
- The last step publishes `@archhypo/plugin-hypo-stage-backend-agents` when `hypo-stage-backend-agents/package.json` equals the tag. The log line `Skipping @archhypo/plugin-hypo-stage-backend-agents` means this was a core-only tag. A published agents package appears as its own npm package page.

**Tag format:** Use `v` + semver (e.g. `v1.1.0`). The workflow strips the `v` and checks it against the frontend and backend versions, then against the agents version for the last publish step.

#### Quick summary (replace `1.1.0` with your version)

Core only:

1. Set `"version": "1.1.0"` in `hypo-stage/package.json` and `hypo-stage-backend/package.json`. Leave the agents version unchanged.
2. Branch, commit those two files, push, open a PR, merge to `main`.
3. **Releases** → **Create a new release** → tag `v1.1.0` from `main` → **Publish release**.

Core and agents:

1. Set `"version": "1.1.0"` in all three: `hypo-stage/package.json`, `hypo-stage-backend/package.json`, and `hypo-stage-backend-agents/package.json`.
2. Branch, commit all three files, push, open a PR, merge to `main`.
3. **Releases** → **Create a new release** → tag `v1.1.0` from `main` → **Publish release**. Confirm `@archhypo/plugin-hypo-stage-backend-agents@1.1.0` on npm.

---

### Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Workflow fails: "Version mismatch" | Tag doesn't match the frontend or backend `package.json` | Ensure tag `vX.Y.Z` equals `"version": "X.Y.Z"` in both core package.json files. The agents version is not part of this check |
| Log says `Skipping @archhypo/plugin-hypo-stage-backend-agents` | Its version differs from the tag | Expected for a core-only release. To publish the module, set `hypo-stage-backend-agents/package.json` to the next tag and release all three packages together. A tag that only matches the old agents version fails, because the frontend and backend must match the tag too |
| Agents publish fails: version already exists | That agents version is already on npm | Bump all three packages to a new version and tag that. npm will not accept the same agents version again |
| Workflow fails: "ENEEDAUTH" | Missing or invalid NPM_TOKEN | Add NPM_TOKEN secret; use Automation or Granular token with publish rights |
| Workflow fails: "403 Forbidden" | Token lacks publish scope | Create token with **Read and write** for `@archhypo` packages |

---

## Manual publishing

If you need to publish locally:

1. **Build first**
   ```bash
   yarn build
   ```

2. **Publish backend, then frontend, then the agents module** when its version is not already on npm. Skip the last command for a core-only release. Publishing an agents version npm already has fails the same way the workflow avoids.
   ```bash
   cd hypo-stage-backend && npm publish --access public
   cd ../hypo-stage && npm publish --access public
   cd ../hypo-stage-backend-agents
   npm view "@archhypo/plugin-hypo-stage-backend-agents@$(node -p "require('./package.json').version")" version \
     || npm publish --access public
   ```

**Note:** NPM requires either two-factor authentication (use `npm publish --otp=CODE`) or an **automation** token. Classic tokens with 2FA enabled will fail; use the GitHub workflow instead.
