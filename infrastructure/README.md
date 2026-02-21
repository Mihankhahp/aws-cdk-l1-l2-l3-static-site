# Infrastructure (Phase 1) — Static Website (AWS CDK)

AWS CDK (v2) project that provisions a **private S3 bucket** fronted by a **CloudFront distribution** using **Origin Access Control (OAC)** for secure access.

## What it creates

- **S3 Bucket**
  - Private (blocks all public access)
  - S3-managed encryption
  - Enforces SSL
  - Versioning enabled
- **CloudFront Distribution**
  - HTTPS redirect
  - Default root: `index.html`
  - SPA-friendly routing (403/404 -> `/index.html`)
  - Reads from S3 via **OAC** (no public bucket)

## Prerequisites

- Node.js (recommended: 18+)
- AWS credentials configured (e.g., `aws configure`)
- AWS CDK v2 available via `npx cdk` (no global install required)

## Install

```bash
cd infrastructure
npm install
```

## Bootstrap (first time per account/region)

```bash
npx cdk bootstrap
```

## Deploy

This project supports **stage** and **version** for naming and outputs.

```bash
npx cdk deploy -c stage=dev -c version=0.0.1
```

### Optional: retain the previous version (keep bucket on destroy)

```bash
npx cdk deploy -c stage=dev -c version=0.0.1 -c retainPreviousVersion=true
```

## Destroy

```bash
npx cdk destroy -c stage=dev -c version=0.0.1
```

> Note: If `retainPreviousVersion=true`, resources (notably the bucket) may be **retained** instead of deleted.

## Configuration

You can provide values via **CDK context** or environment variables:

| Setting          | Context key             | Env var                   | Default |
| ---------------- | ----------------------- | ------------------------- | ------- |
| Stage            | `stage`                 | `STAGE`                   | `dev`   |
| Version          | `version`               | `VERSION`                 | `0.0.0` |
| Retain on delete | `retainPreviousVersion` | `RETAIN_PREVIOUS_VERSION` | `false` |

## Outputs

After deployment you’ll see:

- Stage, Version, Region
- RetainPreviousVersion
- S3 Bucket name
- CloudFront domain name
- CloudFront distribution ID

## Notes

- CDK output folders are ignored by default (`cdk.out`, `.cdk.staging`).
- SPA behavior is enabled via CloudFront custom error responses (403/404 -> `/index.html`). Remove those rules if you don’t want SPA routing.

---

CI/CD (OIDC deploy) will be added in **Phase 2**.
