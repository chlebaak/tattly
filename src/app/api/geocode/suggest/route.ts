import { NextResponse } from "next/server";
import { mapySuggestAddress, mapySuggestCity } from "@/lib/mapy";
import { clientKeyFromRequest, rateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const mode = searchParams.get("mode") ?? "address";

  if (q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  // Veřejný endpoint – chráníme kvótu Mapy.cz před zneužitím.
  const limit = rateLimit({
    key: clientKeyFromRequest(request, "geocode"),
    limit: 120,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { items: [] },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  try {
    if (mode === "city") {
      const items = await mapySuggestCity(q);
      return NextResponse.json({
        items: items.map((i) => ({ city: i.city, label: i.city })),
      });
    }
    if (mode === "address") {
      const items = await mapySuggestAddress(q);
      return NextResponse.json({ items });
    }
    return NextResponse.json({ error: "INVALID_MODE" }, { status: 400 });
  } catch (error) {
    console.error("Geocode suggest failed", error);
    return NextResponse.json({ items: [] }, { status: 502 });
  }
}
