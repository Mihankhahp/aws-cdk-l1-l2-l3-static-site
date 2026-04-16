// static-website-stack.js
import { Stack, CfnOutput, RemovalPolicy, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

/**
 * --------- Helpers ----------
 */
const toBool = (v, defaultValue = false) => {
  if (v === undefined || v === null) return defaultValue;
  return String(v).toLowerCase() === 'true';
};

// S3 bucket naming rules are strict; keep it safe.
// NOTE: bucket name must be globally unique.
const safeBucketName = (name) =>
  String(name)
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .slice(0, 63);

/**
 * --------- Stack ----------
 *
 * Props:
 *   stage: dev/test/prod
 *   version: app version string
 *   retainPreviousVersion: boolean
 *   bucketBaseName: optional base for bucket naming (avoid putting version in bucket name)
 *
 * Env (recommended):
 *   env: { account: '123', region: 'us-east-1' }
 */
export class StaticWebsiteStackL2 extends Stack {
  /**
   * @param {Construct} scope
   * @param {string} id
   * @param {{
   *   stage?: string,
   *   version?: string,
   *   retainPreviousVersion?: boolean,
   *   bucketBaseName?: string,
   *   env?: { account?: string, region?: string }
   * }} [props]
   */
  constructor(scope, id, props = {}) {
    super(scope, id, props);

    // Prefer explicit props, then context, then env vars, then defaults
    const stage = props.stage ?? 'dev';
    const version = props.version ?? '0.0.0';
    const retainPreviousVersion = props.retainPreviousVersion ?? false;
    const bucketBaseName = props.bucketBaseName;

    // CDK sources of truth (resolved from stack env / credentials)
    const account = Stack.of(this).account;
    const region = Stack.of(this).region;

    const removalPolicy = retainPreviousVersion
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    // Tags (recommended way to carry metadata without forcing physical names)
    Tags.of(this).add('Stage', stage);
    Tags.of(this).add('Version', version);
    Tags.of(this).add('Account', account);
    Tags.of(this).add('Region', region);

    // IMPORTANT:
    // If you want immutable versioned deployments, use S3 prefixes/originPath instead.
    const bucketName = bucketBaseName
      ? safeBucketName(`${bucketBaseName}-${stage}-${account}-${region}`)
      : undefined;

    // -----------------------
    // S3 Bucket (private)
    // -----------------------
    const websiteBucket = new s3.Bucket(this, `WebsiteBucket-${stage}`, {
      bucketName, // optional; omit to let CDK generate
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy,
      autoDeleteObjects: removalPolicy === RemovalPolicy.DESTROY,
    });

    // -----------------------
    // CloudFront (L2 + L3 origin) with OAC
    // -----------------------
    // This pattern creates and configures an Origin Access Control (OAC) for private S3 access.
    const origin =
      origins.S3BucketOrigin.withOriginAccessControl(websiteBucket);

    const distribution = new cloudfront.Distribution(
      this,
      `Distribution-${stage}-${version}`,
      {
        defaultBehavior: {
          origin,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          compress: true,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        defaultRootObject: 'index.html',

        // SPA routing (optional). Remove if not needed.
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
          },
        ],
      },
    );

    // -----------------------
    // Outputs
    // -----------------------
    new CfnOutput(this, 'Stage', { value: stage });
    new CfnOutput(this, 'Version', { value: version });
    new CfnOutput(this, 'Account', { value: account });
    new CfnOutput(this, 'Region', { value: region });
    new CfnOutput(this, 'RetainPreviousVersion', {
      value: String(retainPreviousVersion),
    });

    new CfnOutput(this, 'BucketName', { value: websiteBucket.bucketName });
    new CfnOutput(this, 'CloudFrontDomain', { value: distribution.domainName });
    new CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
    });
  }
}
