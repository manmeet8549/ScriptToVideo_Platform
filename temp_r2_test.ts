import { S3Client, ListObjectsV2Command, HeadBucketCommand } from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

console.log('\n--- R2 Config Check ---');
console.log('R2_ACCOUNT_ID:', accountId ? `${accountId.substring(0, 6)}...` : '(Not Found)');
console.log('R2_ACCESS_KEY_ID:', accessKeyId ? `${accessKeyId.substring(0, 6)}...` : '(Not Found)');
console.log('R2_SECRET_ACCESS_KEY:', secretAccessKey ? `${secretAccessKey.substring(0, 6)}...` : '(Not Found)');
console.log('R2_BUCKET_NAME:', bucketName || '(Not Found)');

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
  console.error('\nError: Missing one or more R2 environment variables!');
  process.exit(1);
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function runTest() {
  console.log('\nConnecting to Cloudflare R2...');
  
  try {
    console.log(`Checking bucket access for "${bucketName}" using HeadBucketCommand...`);
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log('✓ Success: Bucket exists and is accessible!');

    console.log('Listing objects in the bucket (checking read permissions)...');
    const listRes = await s3Client.send(new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 5 }));
    console.log('✓ Success: Able to list objects.');
    if (listRes.Contents && listRes.Contents.length > 0) {
      console.log('Found objects in bucket:');
      listRes.Contents.forEach((obj) => {
        console.log(`  - ${obj.Key} (${obj.Size} bytes)`);
      });
    } else {
      console.log('Bucket is empty, which is normal for a new setup.');
    }
  } catch (err: any) {
    console.error('Error Details:', err.name, '-', err.message);
  }
}

runTest();
