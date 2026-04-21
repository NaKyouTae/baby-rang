import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "아기랑 - 우리 아기의 모든 순간";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #e0f7fa 0%, #ffffff 50%, #e0f7fa 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "#30B0C7",
              letterSpacing: "-2px",
            }}
          >
            아기랑
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#555",
              fontWeight: 400,
            }}
          >
            부모와 아기를 위한, 따뜻한 동행
          </div>
          <div
            style={{
              marginTop: "24px",
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {["기질 검사", "성장 기록", "원더윅스", "수면추천", "수유실 찾기"].map(
              (label) => (
                <div
                  key={label}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "20px",
                    backgroundColor: "#30B0C7",
                    color: "#fff",
                    fontSize: 20,
                    fontWeight: 600,
                  }}
                >
                  {label}
                </div>
              )
            )}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            fontSize: 18,
            color: "#999",
          }}
        >
          baby-rang.spectrify.kr
        </div>
      </div>
    ),
    { ...size }
  );
}
