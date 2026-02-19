# Publishing HypoStage to NPM

This guide covers publishing `@archhypo/plugin-hypo-stage` and `@archhypo/plugin-hypo-stage-backend` to the NPM registry.

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

**2. Commit, push, and create tag:**

```bash
NEW_VERSION="0.1.1"

git add hypo-stage/package.json hypo-stage-backend/package.json
git commit -m "chore: release v$NEW_VERSION"
git push origin main

git tag "v$NEW_VERSION"
git push origin "v$NEW_VERSION"
```

**3. Monitor the workflow**

- Go to **Actions** in the repo
- The "Publish to NPM" workflow runs automatically
- It validates versions, builds, then publishes backend then frontend

**Tag format:** Use `v` + semver (e.g. `v0.1.1`, `v1.0.0`). The workflow strips the `v` and checks it matches both `package.json` versions.

#### Quick copy-paste (replace `0.1.1` with your version)

```bash
V=0.1.1
# 1. Edit hypo-stage/package.json and hypo-stage-backend/package.json → "version": "0.1.1"
# 2. Then:
git add hypo-stage/package.json hypo-stage-backend/package.json
git commit -m "chore: release v$V"
git push origin main
git tag "v$V"
git push origin "v$V"
```

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
