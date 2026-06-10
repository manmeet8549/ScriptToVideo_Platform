import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

// Ensure singleton instance
let r2Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!r2Client) {
    if (!accountId || !accessKeyId || !secretAccessKey) {
      console.warn('[R2_CLIENT] Missing Cloudflare R2 credentials. R2 operations will fail.');
    }
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }
  return r2Client;
}

/**
 * Uploads a file (Buffer) to Cloudflare R2.
 */
export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string> {
  const client = getR2Client();
  const bucket = bucketName || '';

  console.log(`[R2_UPLOAD] Uploading to bucket "${bucket}" with key "${key}", content-type: "${contentType}"`);

  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await client.send(command);
    console.log(`[R2_UPLOAD] Successfully uploaded "${key}"`);
    return key;
  } catch (error) {
    console.error(`[R2_UPLOAD] Failed uploading "${key}":`, error);
    throw error;
  }
}

/**
 * Deletes a file from Cloudflare R2.
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  const client = getR2Client();
  const bucket = bucketName || '';

  console.log(`[R2_DELETE] Deleting key "${key}" from bucket "${bucket}"`);

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await client.send(command);
    console.log(`[R2_DELETE] Successfully deleted "${key}"`);
    return true;
  } catch (error) {
    console.error(`[R2_DELETE] Failed deleting "${key}":`, error);
    throw error;
  }
}

/**
 * Generates a signed GET URL for an object in Cloudflare R2.
 * The signed URL will expire after the specified number of seconds (default 1 hour).
 */
export async function generateSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  const client = getR2Client();
  const bucket = bucketName || '';

  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    // Check if the object exists first
    await client.send(command);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[R2_SIGNED_URL] Object "${key}" might not exist in R2 bucket "${bucket}":`, message);
  }

  try {
    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const url = await getSignedUrl(client, getCommand, { expiresIn: expiresInSeconds });
    return url;
  } catch (error) {
    console.error(`[R2_SIGNED_URL] Failed generating signed URL for "${key}":`, error);
    throw error;
  }
}

/**
 * Probes Cloudflare R2 to check if a file key exists.
 */
export async function checkFileExists(key: string): Promise<boolean> {
  const client = getR2Client();
  const bucket = bucketName || '';

  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await client.send(command);
    return true;
  } catch (error) {
    const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    console.error(`[R2_PROBE] Failed probing existence for "${key}":`, error);
    throw error;
  }
}
