import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_FILES,
  createPresignedUpload,
  type UploadPrefix,
} from "@/lib/r2";
import { clientKeyFromRequest, rateLimit } from "@/lib/rate-limit";

const PURPOSE_PREFIX: Record<string, UploadPrefix> = {
  booking: "booking-assets",
  avatar: "avatars",
  portfolio: "portfolio",
};

const bodySchema = z.object({
  purpose: z.enum(["booking", "avatar", "portfolio"]).default("booking"),
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

  // Nahrávání fotek k rezervaci je veřejné (poptávku posílá i nepřihlášený
  // klient), avatar a portfolio ale patří jen přihlášenému profesionálovi –
  // obojí se navíc veřejně servíruje, takže by šlo zneužít jako hosting.
  const isPublicPurpose = parsed.data.purpose === "booking";
  if (!isPublicPurpose) {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
  }

  const limit = rateLimit({
    key: clientKeyFromRequest(request, `uploads:${parsed.data.purpose}`),
    limit: isPublicPurpose ? 60 : 240,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "RATE_LIMITED" },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  for (const file of parsed.data.files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413 });
    }
    if (!(ALLOWED_UPLOAD_TYPES as readonly string[]).includes(file.type)) {
      return NextResponse.json({ error: "UNSUPPORTED_TYPE" }, { status: 415 });
    }
  }
  const prefix = PURPOSE_PREFIX[parsed.data.purpose];
  const uploads = await Promise.all(
    parsed.data.files.map((f) => createPresignedUpload(f.name, f.type, prefix))
  );
  return NextResponse.json({ uploads });
}
