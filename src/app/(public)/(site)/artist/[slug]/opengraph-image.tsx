import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Rezervace u tatéra – Tattly.eu";

export default async function ArtistOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [profile] = await db
    .select({
      displayName: profiles.displayName,
      styles: profiles.styles,
      city: profiles.city,
      studioName: profiles.studioName,
    })
    .from(profiles)
    .where(eq(profiles.slug, slug))
    .limit(1);

  const name = profile?.displayName ?? "Tatér";
  const styles = (profile?.styles ?? "")
    .split(",")
    .map((style) => style.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(" · ");
  const subline = [profile?.studioName, profile?.city]
    .filter(Boolean)
    .join(" · ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f6f5f1",
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 20,
              background: "#12110f",
            }}
          />
          <div
            style={{
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: "-0.04em",
              color: "#12110f",
            }}
          >
            tattly.eu
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              lineHeight: 1.05,
              color: "#12110f",
              maxWidth: 1000,
            }}
          >
            {name}
          </div>
          {styles ? (
            <div style={{ fontSize: 32, color: "#6e6b64", maxWidth: 900 }}>
              {styles}
            </div>
          ) : null}
          {subline ? (
            <div style={{ fontSize: 26, color: "#8a867c" }}>{subline}</div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 26,
            color: "#6e6b64",
          }}
        >
          <span>Rezervace online • záloha QR platbou</span>
          <span style={{ color: "#12110f", fontWeight: 600 }}>
            Rezervovat termín →
          </span>
        </div>
      </div>
    ),
    size
  );
}
