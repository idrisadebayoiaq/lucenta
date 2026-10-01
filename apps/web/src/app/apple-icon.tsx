import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#1d6bff", border: "10px solid #0b0b0f" }}>
        <svg width="160" height="160" viewBox="0 0 64 64">
          <circle cx="29" cy="29" r="13" fill="none" stroke="#fff" strokeWidth="6.5" />
          <path d="M39 39l10 10" stroke="#fff" strokeWidth="7.5" strokeLinecap="square" />
        </svg>
      </div>
    ),
    size,
  );
}
