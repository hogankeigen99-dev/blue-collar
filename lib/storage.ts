import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID;
const bucketName = process.env.R2_BUCKET_NAME || "blue-collar-uploads";

if (!accountId || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
  throw new Error(
    "R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY."
  );
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await client.send(
    new PutObjectCommand({ Bucket: bucketName, Key: key, Body: body, ContentType: contentType })
  );
}

export async function deleteObject(key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
}

/**
 * The bucket is private (no public access configured), so every read goes
 * through a short-lived signed URL rather than a stable public path.
 */
export async function getObjectUrl(key: string): Promise<string> {
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucketName, Key: key }), {
    expiresIn: SIGNED_URL_TTL_SECONDS,
  });
}
