import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Tattly.eu – rezervace se screeningem a zálohou";

export default function OpengraphImage() {
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
              width: 64,
              height: 64,
              borderRadius: 22,
              background: "#12110f",
            }}
          />
          <div
            style={{
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: "-0.04em",
              color: "#12110f",
            }}
          >
            tattly.eu
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.05,
              color: "#12110f",
              maxWidth: 900,
            }}
          >
            Méně papírování.
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.05,
              color: "#12110f",
              maxWidth: 900,
            }}
          >
            Víc tetování.
          </div>
          <div style={{ fontSize: 32, color: "#6e6b64", maxWidth: 820 }}>
            Poptávky, zálohy i kalendář na jednom místě.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#8a867c" }}>
          Rezervační systém pro tatéry • zdarma
        </div>
      </div>
    ),
    size
  );
}
