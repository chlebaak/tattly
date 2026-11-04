type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

const MAX_ENTRIES = 5000;

/**
 * Jednoduchý klouzavý limit pro veřejné endpointy. Je to best-effort:
 * v serverless prostředí platí pro jednu instanci, takže slouží jako
 * ochrana proti běžnému spamu, ne proti cílenému útoku.
 */
export function rateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(params.key) ?? { timestamps: [] };
  const recent = bucket.timestamps.filter(
    (timestamp) => now - timestamp < params.windowMs
  );

  if (recent.length >= params.limit) {
    const oldest = recent[0] ?? now;
    return {
      ok: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((params.windowMs - (now - oldest)) / 1000)
      ),
    };
  }

  recent.push(now);
  bucket.timestamps = recent;
  buckets.set(params.key, bucket);

  if (buckets.size > MAX_ENTRIES) {
    for (const [key, value] of buckets) {
      const latest = value.timestamps.at(-1) ?? 0;
      if (now - latest > 60 * 60 * 1000) buckets.delete(key);
    }
  }

  return { ok: true, retryAfterSeconds: 0 };
}

export function clientKeyFromRequest(request: Request, suffix: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `${suffix}:${ip}`;
}
