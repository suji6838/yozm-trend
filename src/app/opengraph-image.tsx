import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 700,
              color: "#4338ca",
            }}
          >
            Y
          </div>
          <div style={{ display: "flex", fontSize: 34, color: "white", opacity: 0.85 }}>
            YOZM Trend
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: 72,
              fontWeight: 800,
              color: "white",
              lineHeight: 1.2,
            }}
          >
            오늘, 놓치면 아쉬운 흐름
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "white", opacity: 0.9 }}>
            요즘트렌드가 매일 새로운 이야기를 정리해드려요
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
