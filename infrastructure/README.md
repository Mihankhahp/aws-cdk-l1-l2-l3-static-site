# Infrastructure (Phase 1) --- Static Website (AWS CDK)

AWS CDK (v2) project that provisions a private S3 bucket fronted by a
CloudFront distribution using Origin Access Control (OAC) for secure
access.

This repo includes three implementations of the same architecture to
illustrate CDK construct "layers":

- L1: Raw CloudFormation (Cfn\*)
- L2: CDK L2 constructs (s3.Bucket, cloudfront.Distribution) +
  S3BucketOrigin.withOriginAccessControl
- L3: Pattern construct (AWS Solutions Constructs) CloudFrontToS3

---

## What it creates

### Common (all layers)

- S3 Bucket
  - Private (blocks all public access)
  - S3-managed encryption
  - Enforces SSL
  - Versioning enabled
- CloudFront Distribution
  - HTTPS redirect
  - Default root: index.html
  - SPA-friendly routing (403/404 → /index.html)
  - Reads from S3 via OAC (no public bucket)

### L3 extras (Solutions Constructs)

Depending on the pattern defaults you keep enabled, L3 may also include
opinionated best-practices such as logging and security headers.

---

## Repo structure

- bin/infrastructure.js --- entrypoint (selects which layer stack to
  deploy)
- lib/static-website-stack-L1.js --- L1 implementation (Cfn\*)
- lib/static-website-stack-L2.js --- L2 implementation (Bucket +
  Distribution + OAC origin helper)
- lib/static-website-stack-L3.js --- L3 implementation (CloudFrontToS3
  pattern)

---

## Prerequisites

- Node.js (recommended: 18+)
- AWS credentials configured (e.g., aws configure)
- AWS CDK v2 (use npx cdk, no global install required)

---

## Install

cd infrastructure npm install

---

## Optional: install L3 dependency (Solutions Constructs)

Only required if you deploy L3.

npm install @aws-solutions-constructs/aws-cloudfront-s3

If you see peer dependency/version issues, check:

npm list aws-cdk-lib npm view
@aws-solutions-constructs/aws-cloudfront-s3 peerDependencies

---

## Bootstrap (first time per account/region)

npx cdk bootstrap

---

## Deploy

### Choose which layer to deploy

You can select the layer via CDK context (-c layer=...) or environment
variable (CDK_LAYER).

Valid values: l1, l2, l3 (default: l3)

Deploy L3 (default): npx cdk deploy -c stage=dev -c version=0.0.1 -c
layer=l3

Deploy L2: npx cdk deploy -c stage=dev -c version=0.0.1 -c layer=l2

Deploy L1: npx cdk deploy -c stage=dev -c version=0.0.1 -c layer=l1

Or via env var: CDK_LAYER=l2 npx cdk deploy -c stage=dev -c
version=0.0.1

### Optional: retain resources on destroy

npx cdk deploy -c stage=dev -c version=0.0.1 -c
retainPreviousVersion=true

---

## Destroy

Use the same parameters you deployed with (especially the same layer and
stage).

npx cdk destroy -c stage=dev -c version=0.0.1 -c layer=l3

If retainPreviousVersion=true, resources (notably the bucket) may be
retained instead of deleted.

---

## Configuration

You can provide values via CDK context or environment variables:

---

Setting Context key Env var Default

---

Stage stage STAGE dev

Version version VERSION 0.0.0

Retain resources retainPreviousVersion RETAIN_PREVIOUS_VERSION false

Layer layer CDK_LAYER l3
implementation

---

---

## Outputs

After deployment you'll see:

- Stage, Version, Account, Region
- RetainPreviousVersion
- S3 Bucket name
- CloudFront domain name
- CloudFront distribution ID

---

## Notes

- Recommended approach for production: L2 (or L3 if you want
  opinionated defaults).
- Avoid putting version into the bucket name (S3 names are global and
  changing the bucket name forces replacement).
- If you want immutable deployments, use S3 prefixes (e.g., /1.2.3/)
  or CloudFront originPath strategy.
- SPA behavior is enabled via CloudFront errorResponses (403/404 →
  /index.html). Remove those rules if not needed.
- CDK output folders are ignored by default (cdk.out, .cdk.staging).

---

CI/CD (OIDC deploy) will be added in Phase 2.
