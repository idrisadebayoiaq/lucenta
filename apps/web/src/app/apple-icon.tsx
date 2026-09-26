import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#1d9bf0" }}>
        <svg width="180" height="180" viewBox="0 0 64 64">
          <circle cx="28" cy="28" r="13" fill="none" stroke="#fff" strokeWidth="6" />
          <path d="M38 38l11 11" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
          <path d="M28 20.5l2 5.5 5.5 2-5.5 2-2 5.5-2-5.5-5.5-2 5.5-2z" fill="#fff" />
        </svg>
      </div>
    ),
    size,
  );
}
