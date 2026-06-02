import { ImageResponse } from "next/og";

// iOS Add-to-Home-Screen icon. Next generates a 180×180 PNG at build time.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#D45A3F",
          borderRadius: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32">
          <g
            fill="none"
            stroke="#FBF7EE"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 12.5 V25" />
            <path d="M15.4 19 Q13.75 13.45 8 12.8 Q9.65 18.35 15.4 19 Z" />
            <path d="M16.6 19 Q18.25 13.45 24 12.8 Q22.35 18.35 16.6 19 Z" />
          </g>
          <circle cx="16" cy="9.5" r="2.4" fill="#FBF7EE" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
