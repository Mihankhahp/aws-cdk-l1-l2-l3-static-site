// bin/infrastructure.js
import * as cdk from 'aws-cdk-lib';
import { StaticWebsiteStackL1 } from '../lib/static-website-stack-L1.js';
import { StaticWebsiteStackL2 } from '../lib/static-website-stack-L2.js';
import { StaticWebsiteStackL3 } from '../lib/static-website-stack-L3.js';

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

// Which layer to deploy: l1 | l2 | l3
const layerRaw =
  app.node.tryGetContext('layer') ?? process.env.CDK_LAYER ?? 'l3';
const layer = String(layerRaw).toLowerCase();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const commonProps = {
  stage,
  version,
  retainPreviousVersion,
  env,
};

const stackId = `static-website-${stage}`;

switch (layer) {
  case 'l1':
    new StaticWebsiteStackL1(app, stackId, commonProps);
    break;
  case 'l2':
    new StaticWebsiteStackL2(app, stackId, commonProps);
    break;
  case 'l3':
    new StaticWebsiteStackL3(app, stackId, commonProps);
    break;
  default:
    throw new Error(
      `Unknown layer "${layer}". Use l1, l2, or l3 (context: -c layer=l2 or env: CDK_LAYER=l2).`,
    );
}
