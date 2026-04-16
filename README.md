# cdk-static-site-layers

Build and compare the same static website architecture across **AWS CDK L1, L2, and L3 constructs**.

This repo is a hands-on learning project that shows how the **same AWS architecture** changes as you move across CDK abstraction levels:

- **L1** — raw CloudFormation-backed constructs (`Cfn*`)
- **L2** — higher-level AWS CDK constructs
- **L3** — opinionated pattern constructs from AWS Solutions Constructs

The architecture stays mostly the same. The abstraction layer does not.

That makes this repo useful if you want to learn:

- how AWS CDK layers differ in practice,
- what higher-level constructs are hiding for you,
- and when a pattern helps versus when it hides too much.

---

## What this repo builds

Each implementation provisions the same secure static website baseline:

- **Amazon S3** bucket for website assets
  - private bucket
  - block public access
  - server-side encryption
  - versioning enabled
  - SSL-only access
- **Amazon CloudFront** distribution in front of S3
  - HTTPS redirect
  - default root object: `index.html`
  - SPA-friendly routing (`403`/`404` → `/index.html`)
- **Origin Access Control (OAC)**
  - CloudFront can read from S3 securely
  - the bucket does not need to be public

The **L3** implementation may also create additional opinionated resources such as logging and security-header support, depending on the pattern defaults.

---

## Why this repo exists

Most CDK examples show one implementation and stop there.

This repo is different.

It uses **one app entrypoint** and lets you choose between **three infrastructure layers** for the same architecture. That makes it easier to compare:

- readability,
- amount of manual wiring,
- level of control,
- generated infrastructure,
- and developer experience.

If you are learning AWS CDK, this repo is designed to help you answer:

> Should I use L1, L2, or L3 for this kind of infrastructure?

---

## Repo structure

```text
.
├── .github/workflows/
│   └── infrastructure-synth.yml
└── infrastructure/
    ├── bin/
    │   └── infrastructure.js
    ├── lib/
    │   ├── static-website-stack-L1.js
    │   ├── static-website-stack-L2.js
    │   └── static-website-stack-L3.js
    ├── test/
    │   └── infrastructure.test.js
    ├── cdk.json
    ├── package.json
    └── README.md
```

### Important files

- `infrastructure/bin/infrastructure.js` — app entrypoint, selects the stack layer
- `infrastructure/lib/static-website-stack-L1.js` — L1 implementation
- `infrastructure/lib/static-website-stack-L2.js` — L2 implementation
- `infrastructure/lib/static-website-stack-L3.js` — L3 implementation
- `.github/workflows/infrastructure-synth.yml` — GitHub Actions workflow for `cdk synth`

---

## How the app works

The app resolves deployment values in this order:

1. **CDK context**
2. **Environment variables**
3. **Defaults**

It supports these inputs:

| Setting          | Context key             | Env var                   | Default |
| ---------------- | ----------------------- | ------------------------- | ------- |
| Stage            | `stage`                 | `STAGE`                   | `dev`   |
| Version          | `version`               | `VERSION`                 | `0.0.0` |
| Retain resources | `retainPreviousVersion` | `RETAIN_PREVIOUS_VERSION` | `false` |
| Layer            | `layer`                 | `CDK_LAYER`               | `l3`    |

Valid layer values:

- `l1`
- `l2`
- `l3`

---

## Getting started

### Prerequisites

- Node.js 18+
- AWS credentials configured locally
- An AWS account and region ready for CDK bootstrapping

### Install

```bash
cd infrastructure
npm install
```

### Bootstrap your AWS environment

Run this once per AWS account/region if needed:

```bash
npx -y aws-cdk@latest bootstrap
```

### Synthesize the templates

Start with **L2** if you want the easiest implementation to understand:

```bash
npx -y aws-cdk@latest synth -c stage=dev -c version=0.0.1 -c layer=l2
```

Try the pattern-based version:

```bash
npx -y aws-cdk@latest synth -c stage=dev -c version=0.0.1 -c layer=l3
```

Try the low-level version:

```bash
npx -y aws-cdk@latest synth -c stage=dev -c version=0.0.1 -c layer=l1
```

> Note: this repo currently works best when using `npx -y aws-cdk@latest` rather than the older locally pinned CLI version.

### Deploy

```bash
npx -y aws-cdk@latest deploy -c stage=dev -c version=0.0.1 -c layer=l2
```

Or use an environment variable instead of context:

```bash
CDK_LAYER=l3 npx -y aws-cdk@latest deploy -c stage=dev -c version=0.0.1
```

### Retain resources on destroy

```bash
npx -y aws-cdk@latest deploy \
  -c stage=dev \
  -c version=0.0.1 \
  -c layer=l2 \
  -c retainPreviousVersion=true
```

### Destroy

Use the same parameters you deployed with:

```bash
npx -y aws-cdk@latest destroy -c stage=dev -c version=0.0.1 -c layer=l2
```

---

## Which layer should you start with?

### Start with **L2** if you want the practical baseline

Use this when you want the clearest balance between readability, control, and productivity.

### Use **L1** if you want to understand the wiring

Use this when you want to see the raw CloudFormation-style resource model and manually control more of the infrastructure shape.

### Use **L3** if you want a pattern with strong defaults

Use this when you want to move faster and are comfortable letting a reusable pattern decide more of the architecture for you.

---

## Outputs

After deployment, the stack outputs include:

- stage
- version
- account
- region
- retainPreviousVersion
- S3 bucket name
- CloudFront domain name
- CloudFront distribution ID

---

## CI workflow

This repo includes a GitHub Actions workflow that runs:

```bash
npx -y aws-cdk@latest synth
```

The goal is to validate the generated infrastructure early, before deployment automation is added.

---

## Recommended reading order

If you are exploring the repo for the first time, read it in this order:

1. this README
2. `infrastructure/README.md`
3. `infrastructure/bin/infrastructure.js`
4. `infrastructure/lib/static-website-stack-L2.js`
5. `infrastructure/lib/static-website-stack-L1.js`
6. `infrastructure/lib/static-website-stack-L3.js`

---
