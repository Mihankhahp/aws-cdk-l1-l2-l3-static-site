// bin/infrastructure.js
import * as cdk from 'aws-cdk-lib';
import { StaticWebsiteStack } from '../lib/static-website-stack.js';

const app = new cdk.App();

// Prefer context first, then env vars, then defaults
const stage = app.node.tryGetContext('stage') ?? process.env.STAGE ?? 'dev';
const version =
  app.node.tryGetContext('version') ?? process.env.VERSION ?? '0.0.0';

const retainRaw =
  app.node.tryGetContext('retainPreviousVersion') ??
  process.env.RETAIN_PREVIOUS_VERSION ??
  'false';

const retainPreviousVersion = String(retainRaw).toLowerCase() === 'true';

new StaticWebsiteStack(app, `static-website-${stage}`, {
  stage,
  version,
  retainPreviousVersion,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
