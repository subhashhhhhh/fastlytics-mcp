import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { gunzipSync } from 'node:zlib';
import { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } from './config.js';

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export interface R2Object {
  key: string;
  size: number;
  lastModified: Date;
}

export async function listR2Objects(prefix: string, maxKeys = 1000): Promise<R2Object[]> {
  const objects: R2Object[] = [];
  let continuationToken: string | undefined;

  do {
    const cmd = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: maxKeys,
      ContinuationToken: continuationToken,
    });
    const data = await s3.send(cmd);
    if (data.Contents) {
      for (const obj of data.Contents) {
        if (obj.Key) {
          objects.push({
            key: obj.Key,
            size: obj.Size ?? 0,
            lastModified: obj.LastModified ?? new Date(0),
          });
        }
      }
    }
    continuationToken = data.NextContinuationToken;
  } while (continuationToken);

  return objects;
}

export async function getR2Json<T>(key: string): Promise<T | null> {
  try {
    const cmd = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key });
    const data = await s3.send(cmd);
    if (!data.Body) return null;

    const chunks: Uint8Array[] = [];
    for await (const chunk of data.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const text = key.endsWith('.gz')
      ? gunzipSync(buffer).toString('utf-8')
      : buffer.toString('utf-8');
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function getR2Buffer(key: string): Promise<Buffer | null> {
  try {
    const cmd = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key });
    const data = await s3.send(cmd);
    if (!data.Body) return null;

    const chunks: Uint8Array[] = [];
    for await (const chunk of data.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

export async function r2PrefixExists(prefix: string): Promise<boolean> {
  const cmd = new ListObjectsV2Command({
    Bucket: R2_BUCKET_NAME,
    Prefix: prefix,
    MaxKeys: 1,
  });
  const data = await s3.send(cmd);
  return (data.KeyCount ?? 0) > 0;
}

export async function listR2Prefixes(prefix: string, delimiter = '/'): Promise<string[]> {
  const cmd = new ListObjectsV2Command({
    Bucket: R2_BUCKET_NAME,
    Prefix: prefix,
    Delimiter: delimiter,
  });
  const data = await s3.send(cmd);
  return (data.CommonPrefixes ?? []).map((p) => p.Prefix ?? '').filter(Boolean);
}
