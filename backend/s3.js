const aws = require('aws-sdk');
// import crypto from 'crypto';
// import { promisify } from 'util';
const crypto = require('crypto');
const { promisify } = require('util');
const randomBytes = promisify(crypto.randomBytes)

const bucketName = process.env.S3_USERDATA_BUCKET;
// The bucket is private; files are served through CloudFront at this URL (no trailing slash)
const mediaBaseURL = process.env.MEDIA_BASE_URL;
const s3 = new aws.S3({
  region: 'us-east-2',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  signatureVersion: 'v4',
});

// Returns a presigned URL the client PUTs the file to, and the public URL it will be served from.
const generateUploadURL = async () => {
  if (!mediaBaseURL) throw new Error('MEDIA_BASE_URL is not set');

  const rawBytes = await randomBytes(16);
  const filename = rawBytes.toString('hex');

  const params = {
    Bucket: bucketName,
    Key: filename,
    // ContentType: 'audio/mpeg',
    Expires: 60,
  };

  const uploadURL = await s3.getSignedUrlPromise('putObject', params);
  return { uploadURL, fileURL: `${mediaBaseURL}/${filename}` };
}

module.exports = { generateUploadURL };
