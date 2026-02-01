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
       ├── Build container images
       │
       ▼
Azure Container Registry (ACR)
       │
       ▼
Azure Container Apps (Runtime)
```

All container-deployable applications follow this path. There is no shared infrastructure beyond the container registry and the Container Apps environment.

---

## Deployable Units

### Container-Deployable (Azure Container Apps)

| Unit | Path | Description |
|------|------|-------------|
| `app` | `apps/app` | Primary Next.js application |

This is the only container-deployable unit. It:
- Has its own container image
- Has its own Container App instance
- Is deployed via GitHub Actions → ACR → Container Apps

### Externally Hosted (Out of CI/CD Scope)

| Unit | Path | Platform | Description |
|------|------|----------|-------------|
| `docs` | `apps/docs` | Mintlify | Documentation site |

`apps/docs` is a Mintlify documentation project. It is **not** container-deployable:
- Deployed via Mintlify's hosted platform
- Does not produce a container image
- Does not have a Dockerfile
- Does not trigger container deployments
- Changes to `apps/docs` do not affect `app` deployment

---

## Deployment Triggers

A container deployment is triggered when:

1. **Direct changes**: Files within `apps/app/**` change
2. **Shared package changes**: Any file within `packages/**` changes

A container deployment is **not** triggered when:
- `apps/docs` changes (externally hosted)
- External dependencies update (handled at build time, not deployment time)
- Non-code files change outside deployment scope

### Trigger Matrix

| Change Location | Container Deployment |
|-----------------|---------------------|
| `apps/app/**` | ✓ |
| `packages/**` | ✓ |
| `apps/docs/**` | ✗ (Mintlify handles) |
| Root config files | Case-by-case |

---

## Deployment Scope Boundaries

### In Scope (Container CI/CD)
- `apps/app` — Next.js application deployed to Azure Container Apps
- `packages/*` — Shared internal packages (bundled at build time)

### Out of Scope (Externally Managed)
- `apps/docs` — Mintlify documentation (deployed via Mintlify platform)
- `docs/` (root) — Standalone documentation project (not in monorepo workspace)

This separation is intentional. Container CI/CD only manages what runs on Azure infrastructure. External platforms manage their own deployment lifecycles.

---

## Non-Goals

The CI/CD system intentionally does **not**:

- **Infer dependency graphs dynamically** — Deployment triggers are explicit, not computed from import analysis or lockfile diffs
- **Deploy all apps on every commit** — Only affected paths trigger deployment
- **Use Turborepo for deployment orchestration** — Turborepo handles build caching and task ordering; GitHub Actions handles deployment decisions
- **Manage Mintlify deployments** — Documentation is deployed via Mintlify's platform
- **Implement blue-green or canary deployments** — Deployments are rolling updates to Container Apps
- **Auto-rollback on failure** — Failed deployments require manual intervention or explicit rollback workflows

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
| **Mintlify** | Documentation hosting (external, not managed by this CI/CD) |

---

## Glossary

### Deployable Unit (Container)
A self-contained application that produces a container image and runs as an independent service on Azure Container Apps. In this repository: `app` only.

### Externally Hosted Unit
An application or site deployed via a third-party platform outside the container CI/CD pipeline. In this repository: `docs` (Mintlify).

### Shared Package
An internal package in `packages/*` consumed by deployable units. Changes to shared packages trigger redeployment of all container-deployable apps. Shared packages are bundled into the consuming app's container at build time.

### Change Detection
The process of determining which deployable units are affected by a given commit or PR. Implemented via path-based filtering in GitHub Actions. Change detection is explicit and declarative, not inferred from code analysis.

---

## Constraints

1. **No cross-app runtime dependencies** — Apps do not call each other directly. If inter-service communication is needed, it must go through explicit APIs.

2. **Shared packages are build-time only** — Packages are compiled into each app. There is no shared runtime package server.

3. **One container per app** — Each container-deployable unit produces exactly one container image. No sidecar patterns or multi-container pods.

4. **Environment parity** — The same container image is promoted through environments (staging → production). Configuration differences are handled via environment variables.

5. **External platforms are not managed** — Mintlify and other external hosting platforms are out of scope for this CI/CD system.

---

## Future Considerations

Items explicitly out of scope for initial implementation but may be revisited:

- Preview environments per PR
- Automated rollback on health check failure
- Deployment notifications (Slack, etc.)
- Cost optimization via scale-to-zero policies
