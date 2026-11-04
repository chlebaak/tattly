import { NextResponse } from "next/server";
import { createPresignedRead, isPublicUploadKey } from "@/lib/r2";

/**
 * Veřejné obrázky (avatar, portfolio). Klíč se ověřuje proti povoleným
 * prefixům, aby přes tuhle routu nešly stahovat reference klientů.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  let path: string;
  try {
    path = key.map(decodeURIComponent).join("/");
  } catch {
    return NextResponse.json({ error: "INVALID_KEY" }, { status: 400 });
  }

  if (!isPublicUploadKey(path)) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  try {
    const url = await createPresignedRead(path, 3600);
    return new NextResponse(null, {
      status: 302,
      headers: {
        Location: url,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("File redirect failed", error);
    return NextResponse.json({ error: "UNAVAILABLE" }, { status: 502 });
  }
}
