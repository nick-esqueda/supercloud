const aws = require('aws-sdk');
// import crypto from 'crypto';
// import { promisify } from 'util';
const crypto = require('crypto');
const { promisify } = require('util');
const randomBytes = promisify(crypto.randomBytes)

const bucketName = process.env.S3_USERDATA_BUCKET;
const s3 = new aws.S3({
  region: 'us-east-2',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  signatureVersion: 'v4',
});

const generateUploadURL = async () => {
  const rawBytes = await randomBytes(16);
  const filename = rawBytes.toString('hex');

  const params = {
    Bucket: bucketName,
    Key: filename,
    // ContentType: 'audio/mpeg',
    Expires: 60,
  };

  const uploadURL = await s3.getSignedUrlPromise('putObject', params);
  return uploadURL;
}

module.exports = { generateUploadURL };
