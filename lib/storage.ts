import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucketName = process.env.R2_BUCKET_NAME || "blue-collar-uploads";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

let client: S3Client | undefined;

// Lazily constructed so importing this module (e.g. during `next build`'s
// page-data collection, which happens without runtime secrets in CI) never
// throws — only actually calling one of the exported functions without R2
// configured does.
function getClient(): S3Client {
  if (client) return client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY."
    );
  }

  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({ Bucket: bucketName, Key: key, Body: body, ContentType: contentType })
  );
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
}

/**
 * The bucket is private (no public access configured), so every read goes
 * through a short-lived signed URL rather than a stable public path.
 */
export async function getObjectUrl(key: string): Promise<string> {
  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: bucketName, Key: key }), {
    expiresIn: SIGNED_URL_TTL_SECONDS,
  });
}
