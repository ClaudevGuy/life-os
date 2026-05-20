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
          <path d="M16 5 L27 16 L16 27 L5 16 Z" fill="#FBF7EE" />
          <path
            d="M16 11 L21 16 L16 21 L11 16 Z"
            fill="#D45A3F"
            opacity="0.55"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
