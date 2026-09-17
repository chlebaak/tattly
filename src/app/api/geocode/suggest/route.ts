import { NextResponse } from "next/server";
import { mapySuggestAddress, mapySuggestCity } from "@/lib/mapy";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const mode = searchParams.get("mode") ?? "address";

  if (q.length < 2) {
    return NextResponse.json({ items: [] });
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
