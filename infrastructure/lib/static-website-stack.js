// static-website-stack.js
import { Stack, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

/**
 * --------- Helpers ----------
 */
const toBool = (v, defaultValue = false) => {
  if (v === undefined || v === null) return defaultValue;
  return String(v).toLowerCase() === 'true';
};

const safeBucketName = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .slice(0, 63);

/**
 * --------- "Constructs" (same file, separated concerns) ----------
 */

class WebsiteBucket extends Construct {
  /**
   * @param {Construct} scope
   * @param {string} id
   * @param {{
   *   bucketName: string,
   *   removalPolicy: import('aws-cdk-lib').RemovalPolicy
   * }} props
   */
  constructor(scope, id, props) {
    super(scope, id);

    const { bucketName, removalPolicy } = props;

    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy,
      autoDeleteObjects: removalPolicy === RemovalPolicy.DESTROY,
    });
  }

  /**
   * Allow CloudFront distribution to read objects via OAC.
   * @param {string} distributionId
   */
  allowCloudFrontRead(distributionId) {
    this.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AllowCloudFrontReadViaOAC',
        actions: ['s3:GetObject'],
        resources: [this.bucket.arnForObjects('*')],
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${this.bucket.stack.account}:distribution/${distributionId}`,
          },
        },
      }),
    );
  }
}

class CloudFrontOac extends Construct {
  /**
   * @param {Construct} scope
   * @param {string} id
   * @param {{ name: string }} props
   */
  constructor(scope, id, props) {
    super(scope, id);

    const oac = new cloudfront.CfnOriginAccessControl(this, 'Oac', {
      originAccessControlConfig: {
        name: props.name,
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4',
        description: 'OAC for private S3 origin',
      },
    });

    this.oacId = oac.attrId;
  }
}

class WebsiteDistribution extends Construct {
  /**
   * @param {Construct} scope
   * @param {string} id
   * @param {{
   *   stage: string,
   *   version: string,
   *   bucket: import('aws-cdk-lib/aws-s3').IBucket,
   *   oacId: string,
   *   originPath?: string
   * }} props
   */
  constructor(scope, id, props) {
    super(scope, id);

    const originId = 'S3Origin';

    const distribution = new cloudfront.CfnDistribution(this, 'Distribution', {
      distributionConfig: {
        enabled: true,
        comment: `static-site ${props.stage} ${props.version}`,
        defaultRootObject: 'index.html',
        httpVersion: 'http2',
        priceClass: 'PriceClass_100',

        origins: [
          {
            id: originId,
            domainName: props.bucket.bucketRegionalDomainName,
            originAccessControlId: props.oacId,
            originPath: props.originPath,
            s3OriginConfig: {},
          },
        ],

        defaultCacheBehavior: {
          targetOriginId: originId,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
          cachedMethods: ['GET', 'HEAD', 'OPTIONS'],
          compress: true,
          forwardedValues: {
            queryString: false,
            cookies: { forward: 'none' },
          },
        },

        // Optional SPA support; delete these two lines if you don't want SPA routing behavior
        customErrorResponses: [
          {
            errorCode: 403,
            responseCode: 200,
            responsePagePath: '/index.html',
          },
          {
            errorCode: 404,
            responseCode: 200,
            responsePagePath: '/index.html',
          },
        ],

        viewerCertificate: {
          cloudFrontDefaultCertificate: true,
        },
      },
    });

    this.distributionId = distribution.ref;
    this.domainName = distribution.attrDomainName;
  }
}

/**
 * --------- Stack ----------
 *
 * Props:
 *   stage: dev/test/prod
 *   version: app version string
 *   retainPreviousVersion: boolean
 */
export class StaticWebsiteStack extends Stack {
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

    // "region" comes from stack env (CDK_DEFAULT_REGION), this is the correct source of truth
    const region = this.region;
    const account = this.account;

    const removalPolicy = retainPreviousVersion
      ? RemovalPolicy.RETAIN
      : RemovalPolicy.DESTROY;

    const bucketName = safeBucketName(
      `static-${stage}-${version}-${account}-${region}`,
    );

    const websiteBucket = new WebsiteBucket(this, 'WebsiteBucket', {
      bucketName,
      removalPolicy,
    });

    const oac = new CloudFrontOac(this, 'Oac', {
      name: `oac-${stage}-${version}`,
    });

    const distribution = new WebsiteDistribution(this, 'WebsiteDistribution', {
      stage,
      version,
      bucket: websiteBucket.bucket,
      oacId: oac.oacId,
      // If you deploy versioned folders like /1.0.0, uncomment:
      // originPath: `/${version}`,
    });

    websiteBucket.allowCloudFrontRead(distribution.distributionId);

    new CfnOutput(this, 'Stage', { value: stage });
    new CfnOutput(this, 'Version', { value: version });
    new CfnOutput(this, 'Region', { value: region });
    new CfnOutput(this, 'RetainPreviousVersion', {
      value: String(retainPreviousVersion),
    });
    new CfnOutput(this, 'BucketName', {
      value: websiteBucket.bucket.bucketName,
    });
    new CfnOutput(this, 'CloudFrontDomain', { value: distribution.domainName });
    new CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
    });
  }
}
