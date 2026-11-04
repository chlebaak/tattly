import { randomUUID } from "node:crypto";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireEnv } from "./env";

export const MAX_UPLOAD_FILES = 4;
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

let r2Client: S3Client | null = null;

function getR2(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
      },
    });
  }
  return r2Client;
}

export type SignedUpload = {
  key: string;
  uploadUrl: string;
  publicUrl: string | null;
};

export type UploadPrefix = "booking-assets" | "avatars" | "portfolio";

/** Prefixy, které smí obrázková routa /api/files veřejně servírovat. */
export const PUBLIC_UPLOAD_PREFIXES = ["avatars/", "portfolio/"] as const;

export function isPublicUploadKey(key: string): boolean {
  return PUBLIC_UPLOAD_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export async function createPresignedUpload(
  fileName: string,
  contentType: string,
  prefix: UploadPrefix = "booking-assets"
): Promise<SignedUpload> {
  const bucket = requireEnv("R2_BUCKET");
  const safeName =
    fileName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w.-]+/g, "-")
      .slice(-80) || "reference.jpg";
  const key = `${prefix}/${randomUUID()}/${safeName}`;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(getR2(), command, { expiresIn: 300 });
  const publicBase = process.env.R2_PUBLIC_URL;
  const publicUrl = publicBase
    ? `${publicBase.replace(/\/$/, "")}/${key}`
    : null;
  return { key, uploadUrl, publicUrl };
}

export async function createPresignedRead(
  key: string,
  expiresIn = 900
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: requireEnv("R2_BUCKET"),
    Key: key,
  });
  return getSignedUrl(getR2(), command, { expiresIn });
}

/**
 * Smaže objekty z bucketu (např. když tatér odebere fotku z portfolia).
 * Ve výchozím stavu nikdy nevyhazuje – běžné uklízení nesmí shodit uložení
 * formuláře. Ve `strict` režimu chybu propustí (cron si tak vynutí retry).
 */
export async function deleteObjects(
  keys: string[],
  options?: { strict?: boolean }
): Promise<{ ok: boolean; deleted: number }> {
  const unique = Array.from(new Set(keys.filter(Boolean)));
  if (!unique.length) return { ok: true, deleted: 0 };
  try {
    await getR2().send(
      new DeleteObjectsCommand({
        Bucket: requireEnv("R2_BUCKET"),
        Delete: { Objects: unique.map((key) => ({ Key: key })) },
      })
    );
    return { ok: true, deleted: unique.length };
  } catch (error) {
    console.error("R2 delete failed", error);
    if (options?.strict) throw error;
    return { ok: false, deleted: 0 };
  }
}

export type ListedObject = {
  key: string;
  lastModified: Date | null;
  size: number | null;
};

/** Jedna stránka výpisu objektů v bucketu (pro úklid osiřelých souborů). */
export async function listObjectsPage(params: {
  prefix: string;
  continuationToken?: string;
  maxKeys?: number;
}): Promise<{ objects: ListedObject[]; nextToken: string | null }> {
  const response = await getR2().send(
    new ListObjectsV2Command({
      Bucket: requireEnv("R2_BUCKET"),
      Prefix: params.prefix,
      ContinuationToken: params.continuationToken,
      MaxKeys: params.maxKeys ?? 1000,
    })
  );
  return {
    objects: (response.Contents ?? []).map((object) => ({
      key: object.Key ?? "",
      lastModified: object.LastModified ?? null,
      size: object.Size ?? null,
    })),
    nextToken: response.IsTruncated ? (response.NextContinuationToken ?? null) : null,
  };
}

/** Z veřejné adresy `/api/files/<key>` vytáhne klíč (jinak null). */
export function keyFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const prefix = "/api/files/";
  if (!url.startsWith(prefix)) return null;
  try {
    const key = decodeURIComponent(url.slice(prefix.length));
    return key.length ? key : null;
  } catch {
    return null;
  }
}
