import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import type { Readable as NodeReadable } from 'node:stream';

function toNodeReadable(body: unknown): NodeReadable {
  if (body instanceof Readable) {
    return body;
  }
  throw new Error('Unsupported S3 body stream');
}
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: true,
});

export const S3_BUCKET = process.env.S3_BUCKET || 'zktalk-uploads';
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
