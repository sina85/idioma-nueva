# Cloud Architecture & Deployment

## Overview

This document defines the deployment architecture, CI/CD strategy, and operational constraints for this monorepo. It serves as the source of truth for deployment decisions and automation logic.

---

## Architecture

```
GitHub Repository
       │
       ▼
GitHub Actions (CI/CD)
       │
       ├── Detect changes
       ├── Build affected container images
       │
       ▼
Azure Container Registry (ACR)
       │
       ▼
Azure Container Apps (Runtime)
```

All container-deployable applications follow this path. Only apps with changes (or dependency changes) are built and deployed.

---

## Deployable Units

### Container-Deployable (Azure Container Apps)

| Unit | Path | Container App Secret | Description |
|------|------|---------------------|-------------|
| `app` | `apps/app` | `AZURE_CONTAINER_APP_NAME` | Primary Next.js application |
| `docs` | `apps/docs` | `AZURE_CONTAINER_APP_DOCS_NAME` | Documentation site |

Each container-deployable unit:
- Has its own Dockerfile
- Has its own container image
- Has its own Container App instance
- Is deployed independently based on change detection

---

## Deployment Triggers & Change Detection

The CI/CD workflow uses smart change detection to determine which apps need deployment:

### Trigger Matrix

| Change Location | `app` deployed | `docs` deployed |
|-----------------|----------------|-----------------|
| `apps/app/**` | ✓ | ✗ |
| `apps/docs/**` | ✗ | ✓ |
| `packages/**` | ✓ | ✓ |

### Logic

1. **Direct changes**: If files in `apps/<name>/**` change, that app is deployed
2. **Shared package changes**: If files in `packages/**` change, ALL apps are deployed (shared dependencies)

This ensures:
- Apps are only rebuilt when necessary
- Shared package updates propagate to all dependent apps
- No unnecessary deployments when unrelated code changes

---

## Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `AZURE_CREDENTIALS` | Azure service principal credentials (JSON) |
| `ACR_NAME` | Azure Container Registry name |
| `ACR_LOGIN_SERVER` | ACR login server URL |
| `AZURE_RESOURCE_GROUP` | Azure resource group name |
| `AZURE_CONTAINER_APP_NAME` | Container App name for `app` |
| `AZURE_CONTAINER_APP_DOCS_NAME` | Container App name for `docs` |

---

## Adding a New App

To add a new container-deployable app:

1. Create the app in `apps/<name>/`
2. Add a `Dockerfile` in `apps/<name>/Dockerfile`
3. Update `.github/workflows/deploy.yml`:
   - Add path to `on.push.paths`
   - Add change detection output in `detect` job
   - Add new `deploy-<name>` job
   - Update `summary` job
4. Add `AZURE_CONTAINER_APP_<NAME>_NAME` secret in GitHub
5. Create the Container App in Azure

---

## Tooling Responsibilities

| Tool | Responsibility |
|------|----------------|
| **pnpm** | Package management, workspace resolution |
| **Turborepo** | Build task orchestration, caching, parallel execution |
| **GitHub Actions** | Change detection, deployment orchestration, secrets management |
| **Docker** | Container image builds |
| **Azure Container Registry** | Image storage and versioning |
| **Azure Container Apps** | Runtime execution, scaling, ingress |

---

## Constraints

1. **No cross-app runtime dependencies** — Apps do not call each other directly. If inter-service communication is needed, it must go through explicit APIs.

2. **Shared packages are build-time only** — Packages are compiled into each app. There is no shared runtime package server.

3. **One container per app** — Each container-deployable unit produces exactly one container image. No sidecar patterns or multi-container pods.

4. **Environment parity** — The same container image is promoted through environments (staging → production). Configuration differences are handled via environment variables.

---

## Future Considerations

Items explicitly out of scope for initial implementation but may be revisited:

- Preview environments per PR
- Automated rollback on health check failure
- Deployment notifications (Slack, etc.)
- Cost optimization via scale-to-zero policies
