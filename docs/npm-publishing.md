# Publishing HypoStage to NPM

This guide covers publishing `@archhypo/plugin-hypo-stage` and `@archhypo/plugin-hypo-stage-backend` to the NPM registry.

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

Before `1.0.0`, treat the API as unstable. Increment MINOR for new features and PATCH for fixes. Release `1.0.0` when the API is stable and production-ready.

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

Follow these steps exactly. The tag **must** match the version in both `package.json` files (e.g. tag `v0.1.1` requires `"version": "0.1.1"` in both packages).

**1. Update version** in both `package.json` files to the new semver (e.g. `0.1.1`):

- `hypo-stage/package.json` → `"version": "0.1.1"`
- `hypo-stage-backend/package.json` → `"version": "0.1.1"`

Both must have the **exact same** version string. The workflow will fail if they differ or don't match the tag.

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
- It validates versions, builds, then publishes backend then frontend

**Tag format:** Use `v` + semver (e.g. `v0.1.1`, `v1.0.0`). The workflow strips the `v` and checks it matches both `package.json` versions.

#### Quick summary (replace `0.1.1` with your version)

1. Edit `hypo-stage/package.json` and `hypo-stage-backend/package.json` → `"version": "0.1.1"`
2. Branch, commit, push, open PR, merge to `main` (see step 2 above)
3. After merge: **Releases** → **Create a new release** → create tag `v0.1.1` from `main` → **Publish release**

---

### Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Workflow fails: "Version mismatch" | Tag doesn't match `package.json` | Ensure tag `vX.Y.Z` equals `"version": "X.Y.Z"` in both package.json files |
| Workflow fails: "ENEEDAUTH" | Missing or invalid NPM_TOKEN | Add NPM_TOKEN secret; use Automation or Granular token with publish rights |
| Workflow fails: "403 Forbidden" | Token lacks publish scope | Create token with **Read and write** for `@archhypo` packages |

---

## Manual publishing

If you need to publish locally:

1. **Build first**
   ```bash
   yarn build
   ```

2. **Publish backend, then frontend**
   ```bash
   cd hypo-stage-backend && npm publish --access public
   cd ../hypo-stage && npm publish --access public
   ```

**Note:** NPM requires either two-factor authentication (use `npm publish --otp=CODE`) or an **automation** token. Classic tokens with 2FA enabled will fail; use the GitHub workflow instead.
