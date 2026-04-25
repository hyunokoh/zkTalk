import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateBucketCommand,
  CreateMultipartUploadCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import type { Readable as NodeReadable } from 'node:stream';
import {
  getS3AccessKey,
  getS3Bucket,
  getS3Endpoint,
  getS3Region,
  getS3SecretKey,
} from './env.js';

function toNodeReadable(body: unknown): NodeReadable {
  if (body instanceof Readable) {
    return body;
  }
  throw new Error('Unsupported S3 body stream');
}
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const S3_ENDPOINT = getS3Endpoint();
const S3_REGION = getS3Region();
const S3_ACCESS_KEY = getS3AccessKey();
const S3_SECRET_KEY = getS3SecretKey();

export const s3 = new S3Client({
  ...(S3_ENDPOINT ? { endpoint: S3_ENDPOINT } : {}),
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
  forcePathStyle: Boolean(S3_ENDPOINT),
});

export const S3_BUCKET = getS3Bucket();
export const S3_PRESIGN_TTL_SECONDS = 60 * 60;

export async function createPresignedUploadUrl(options: {
  bucket?: string;
  objectKey: string;
  contentType: string;
}) {
  const command = new PutObjectCommand({
    Bucket: options.bucket ?? S3_BUCKET,
    Key: options.objectKey,
    ContentType: options.contentType,
  });

  return getSignedUrl(s3, command, { expiresIn: S3_PRESIGN_TTL_SECONDS });
}

export async function createMultipartUpload(options: {
  bucket?: string;
  objectKey: string;
  contentType: string;
}) {
  const result = await s3.send(
    new CreateMultipartUploadCommand({
      Bucket: options.bucket ?? S3_BUCKET,
      Key: options.objectKey,
      ContentType: options.contentType,
    }),
  );

  if (!result.UploadId) {
    throw new Error('Failed to create multipart upload');
  }

  return result.UploadId;
}

export async function createMultipartPartUploadUrl(options: {
  bucket?: string;
  objectKey: string;
  uploadId: string;
  partNumber: number;
}) {
  const command = new UploadPartCommand({
    Bucket: options.bucket ?? S3_BUCKET,
    Key: options.objectKey,
    UploadId: options.uploadId,
    PartNumber: options.partNumber,
  });

  return getSignedUrl(s3, command, { expiresIn: S3_PRESIGN_TTL_SECONDS });
}

export async function completeMultipartUpload(options: {
  bucket?: string;
  objectKey: string;
  uploadId: string;
  parts: Array<{ partNumber: number; etag: string }>;
}) {
  await s3.send(
    new CompleteMultipartUploadCommand({
      Bucket: options.bucket ?? S3_BUCKET,
      Key: options.objectKey,
      UploadId: options.uploadId,
      MultipartUpload: {
        Parts: options.parts.map((part) => ({
          PartNumber: part.partNumber,
          ETag: part.etag,
        })),
      },
    }),
  );
}

export async function abortMultipartUpload(options: {
  bucket?: string;
  objectKey: string;
  uploadId: string;
}) {
  await s3.send(
    new AbortMultipartUploadCommand({
      Bucket: options.bucket ?? S3_BUCKET,
      Key: options.objectKey,
      UploadId: options.uploadId,
    }),
  );
}

export async function headStoredObject(options: {
  bucket?: string;
  objectKey: string;
}) {
  return s3.send(
    new HeadObjectCommand({
      Bucket: options.bucket ?? S3_BUCKET,
      Key: options.objectKey,
    }),
  );
}

export async function getStoredObjectStream(options: {
  bucket?: string;
  objectKey: string;
}) {
  const result = await s3.send(
    new GetObjectCommand({
      Bucket: options.bucket ?? S3_BUCKET,
      Key: options.objectKey,
    }),
  );

  if (!result.Body) {
    throw new Error('Stored object body is empty');
  }

  return toNodeReadable(result.Body);
}

export function getStorageBucket() {
  return S3_BUCKET;
}

export function getPresignTtlSeconds() {
  return S3_PRESIGN_TTL_SECONDS;
}

export async function putStoredObject(options: {
  bucket?: string;
  objectKey: string;
  body: Buffer | Uint8Array;
  contentType?: string;
}) {
  return s3.send(
    new PutObjectCommand({
      Bucket: options.bucket ?? S3_BUCKET,
      Key: options.objectKey,
      Body: options.body,
      ContentType: options.contentType,
    }),
  );
}

/**
 * Idempotent — creates the configured bucket if it does not already exist.
 * Called at API startup so a fresh dev environment doesn't have to run
 * `mc mb` manually before the first upload. Only logs and never throws,
 * since the rest of the API can still boot if the storage check fails.
 */
export async function ensureStorageBucketExists(
  logger: { info: (msg: string) => void; warn: (msg: string) => void },
): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    return;
  } catch {
    // Either the bucket doesn't exist or we lack permission to head it.
    // Try to create it; if that also fails the upstream upload calls will
    // surface the actual error.
  }

  try {
    await s3.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
    logger.info(`[s3] created bucket "${S3_BUCKET}"`);
  } catch (error) {
    logger.warn(
      `[s3] could not create bucket "${S3_BUCKET}": ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
