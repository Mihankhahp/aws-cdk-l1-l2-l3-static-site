// static-website-stack.js
import { Stack, CfnOutput, RemovalPolicy, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';

/**
 * --------- Helpers ----------
 */
const toBool = (v, defaultValue = false) => {
  if (v === undefined || v === null) return defaultValue;
  return String(v).toLowerCase() === 'true';
};

/**
 * --------- Stack ----------
 *
 * Props:
 *   stage?: dev/test/prod
 *   version?: app version string
 *   retainPreviousVersion?: boolean
 *
 * Notes:
 * - This file uses a true L3 pattern: CloudFrontToS3 (AWS Solutions Constructs).
 * - It provisions CloudFront + S3 using OAC automatically.
 */
export class StaticWebsiteStackL3 extends Stack {
  /**
   * @param {Construct} scope
   * @param {string} id
   * @param {{
   *   stage?: string,
   *   version?: string,
   *   retainPreviousVersion?: boolean,
   *   env?: { account?: string, region?: string }
   * }} [props]
   */
  constructor(scope, id, props = {}) {
    super(scope, id, props);

    const stage =
      props.stage ??
      this.node.tryGetContext('stage') ??
      process.env.STAGE ??
      'dev';

    const version =
      props.version ??
      this.node.tryGetContext('version') ??
      process.env.VERSION ??
      '0.0.0';

    const retainPreviousVersion =
      props.retainPreviousVersion ??
      toBool(
        this.node.tryGetContext('retainPreviousVersion') ??
          process.env.RETAIN_PREVIOUS_VERSION,
        false,
      );

    const removalPolicy = retainPreviousVersion
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    const account = Stack.of(this).account;
    const region = Stack.of(this).region;

    // Tags keep your metadata without forcing physical names (recommended)
    Tags.of(this).add('Stage', stage);
    Tags.of(this).add('Version', version);
    Tags.of(this).add('Account', account);
    Tags.of(this).add('Region', region);

    /**
     * ✅ FULL L3:
     * CloudFrontToS3 provisions:
     * - CloudFront Distribution
     * - S3 bucket (private)
     * - Origin Access Control (OAC) and required permissions
     * - logging buckets (default) + security headers (default)
     */
    const pattern = new CloudFrontToS3(this, `StaticSite-${stage}-${version}`, {
      // S3 bucket settings (pattern already defaults to secure settings;
      // we override removal behavior here)
      bucketProps: {
        removalPolicy,
        autoDeleteObjects: removalPolicy === RemovalPolicy.DESTROY,
        // IMPORTANT: don’t hardcode bucketName unless you truly need it (global + replacement risk).
      },

      // CloudFront Distribution overrides
      cloudFrontDistributionProps: {
        defaultRootObject: 'index.html',
        comment: `static-site ${stage} ${version}`,
        defaultBehavior: {
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          compress: true,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },

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
    });

    // Outputs
    new CfnOutput(this, 'Stage', { value: stage });
    new CfnOutput(this, 'Version', { value: version });
    new CfnOutput(this, 'Account', { value: account });
    new CfnOutput(this, 'Region', { value: region });
    new CfnOutput(this, 'RetainPreviousVersion', {
      value: String(retainPreviousVersion),
    });

    // Pattern exposes the created resources
    new CfnOutput(this, 'BucketName', {
      value: pattern.s3BucketInterface.bucketName,
    });
    new CfnOutput(this, 'CloudFrontDomain', {
      value: pattern.cloudFrontWebDistribution.domainName,
    });
    new CfnOutput(this, 'CloudFrontDistributionId', {
      value: pattern.cloudFrontWebDistribution.distributionId,
    });
  }
}
