# Deployment

BioassayCraft deploys through GitHub Actions to Cloudflare Workers static assets.

Use this document together with:

- [Technical Direction](technical-direction.md)
- [Project Structure](project-structure.md)
- [Upgrade Report](upgrade-report.md)

## Deployment Model

The production deployment path is:

```text
GitHub Actions
  -> npm ci
  -> npm run build
  -> npx wrangler deploy
  -> Cloudflare Workers static assets
```

The Worker name is:

```text
bioassaycraft
```

Static assets are served from:

```text
./dist
```

`wrangler.jsonc` enables:

```jsonc
"not_found_handling": "404-page"
```

This ensures paths without a concrete file return the generated 404 page. The Worker handles legacy-path redirects before static assets are served.

## GitHub Actions

Workflow file:

```text
.github/workflows/deploy.yml
```

Triggers:

- Push to `main`.
- Manual `workflow_dispatch`.

Node.js version:

```text
22.13.0
```

This satisfies the project `package.json` engine range:

```text
^20.19.0 || ^22.13.0 || >=24
```

## Required GitHub Secrets

Add these repository secrets in GitHub:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

The API token should have permission to deploy the `bioassaycraft` Worker.

## Cloudflare Dashboard

Do not rely on Cloudflare's connected Git build for this project.

Cloudflare online builds can remain disabled or unused. GitHub Actions is responsible for build and deploy.

Cloudflare should keep:

- The Worker project.
- Any production route or custom domain mapping.
- The account that owns the Worker.

## Manual Deployment

From GitHub:

1. Open the repository.
2. Go to `Actions`.
3. Select `Deploy to Cloudflare Workers`.
4. Click `Run workflow`.
5. Choose the `main` branch.
6. Run the workflow.

Local dry run:

```bash
npm run build
npx wrangler deploy --dry-run
```

Local production deploy, when credentials are available:

```bash
npm run build
npx wrangler deploy
```
