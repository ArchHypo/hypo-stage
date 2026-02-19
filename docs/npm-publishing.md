# Publishing HypoStage to NPM

This guide covers publishing `@archhypo/plugin-hypo-stage` and `@archhypo/plugin-hypo-stage-backend` to the NPM registry.

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

### Release steps

1. **Update version** in both `package.json` files:
   ```bash
   # In hypo-stage/package.json and hypo-stage-backend/package.json
   "version": "0.1.1"
   ```

2. **Commit and push**
   ```bash
   git add hypo-stage/package.json hypo-stage-backend/package.json
   git commit -m "chore: release v0.1.1"
   git push origin main
   ```

3. **Create and push tag**
   ```bash
   git tag v0.1.1
   git push origin v0.1.1
   ```

4. The workflow will:
   - Verify package versions match the tag
   - Build the project
   - Publish backend, then frontend to NPM

Check **Actions** in the repo to monitor the run.

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
