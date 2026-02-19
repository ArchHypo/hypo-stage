# Backstage Plugin Directory

This folder contains materials for adding HypoStage to the [official Backstage Plugin Directory](https://backstage.io/plugins/).

- **hypo-stage.yaml** — The YAML file to submit in a PR to [backstage/backstage](https://github.com/backstage/backstage) at `microsite/data/plugins/hypo-stage.yaml`
- **SUBMISSION.md** — Full checklist and instructions for submission (NPM publishing, validation, PR steps)

The project is prepared for publishing: packages use `@archhypo/plugin-hypo-stage` and `@archhypo/plugin-hypo-stage-backend`, include `backstage.pluginId` and `backstage.pluginPackages`, and the root `tsconfig.json` enables `backstage-cli package prepack`.
