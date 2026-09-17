import { requireEnv } from "./env";

const SUGGEST_URL = "https://api.mapy.cz/v1/suggest";

type SuggestItem = {
  name: string;
  location?: string;
  type: string;
  position?: { lon: number; lat: number };
  regionalStructure?: { name: string; type: string }[];
  zip?: string;
};

export type MapyAddressItem = {
  addressLine: string;
  city: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  label: string;
};

export type MapyCityItem = { city: string };

async function suggestRequest(query: string, type: string, limit: number) {
  const params = new URLSearchParams({
    apikey: requireEnv("MAPY_CZ_API_KEY"),
    query,
    lang: "cs",
    limit: String(limit),
    type,
  });
  const res = await fetch(`${SUGGEST_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Mapy.cz suggest failed: ${res.status}`);
  }
  return (await res.json()) as { items?: SuggestItem[] };
}

export async function mapySuggestAddress(
  query: string,
  limit = 6
): Promise<MapyAddressItem[]> {
  const data = await suggestRequest(query, "regional.address", limit);
  return (data.items ?? []).map((item) => {
    const regional = item.regionalStructure ?? [];
    const city =
      regional.find((r) => r.type === "regional.municipality")?.name ??
      regional.find((r) => r.type === "regional.municipality_part")?.name ??
      null;
    return {
      addressLine: item.name,
      city,
      zip: item.zip ?? null,
      lat: item.position?.lat ?? null,
      lng: item.position?.lon ?? null,
      label: `${item.name}${item.location ? `, ${item.location}` : ""}`,
    };
  });
}

export async function mapySuggestCity(
  query: string,
  limit = 6
): Promise<MapyCityItem[]> {
  const data = await suggestRequest(query, "regional.municipality", limit);
  return (data.items ?? []).map((item) => ({ city: item.name }));
}
