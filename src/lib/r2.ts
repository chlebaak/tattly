import { randomUUID } from "node:crypto";
import {
  GetObjectCommand,
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

export async function createPresignedUpload(
  fileName: string,
  contentType: string
): Promise<SignedUpload> {
  const bucket = requireEnv("R2_BUCKET");
  const safeName =
    fileName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w.-]+/g, "-")
      .slice(-80) || "reference.jpg";
  const key = `booking-assets/${randomUUID()}/${safeName}`;
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
