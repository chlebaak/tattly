import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_FILES,
  createPresignedUpload,
} from "@/lib/r2";

const bodySchema = z.object({
  files: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        size: z.number().int().positive(),
        type: z.string(),
      })
    )
    .min(1)
    .max(MAX_UPLOAD_FILES),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  for (const file of parsed.data.files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413 });
    }
    if (!(ALLOWED_UPLOAD_TYPES as readonly string[]).includes(file.type)) {
      return NextResponse.json({ error: "UNSUPPORTED_TYPE" }, { status: 415 });
    }
  }
  const uploads = await Promise.all(
    parsed.data.files.map((f) => createPresignedUpload(f.name, f.type))
  );
  return NextResponse.json({ uploads });
}
