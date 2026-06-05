import { loadFont } from "@remotion/google-fonts/Inter";

// Inter stands in for Geist (the app's font) — visually near-identical, and
// reliably bundled by @remotion/google-fonts so renders are deterministic.
export const { fontFamily: FONT } = loadFont("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

// Palette mirrors the marketing landing page (marketing/app/globals.css)
// so the video blends into the site it's embedded on.
export const C = {
  bg: "#070710",
  bg2: "#0b0b18",
  ink: "#edecf5",
  muted: "#a6a4ba",
  faint: "#6f6d86",
  line: "rgba(255,255,255,0.10)",
  line2: "rgba(255,255,255,0.16)",
  card: "rgba(255,255,255,0.045)",
  terra: "#e2674a",
  gold: "#e8c07a",
  violet: "#8b7cf0",
  sky: "#56b6e8",
  sage: "#7fd0a6",
  paper: "#FBF7EE",
};

export const GRAD =
  "linear-gradient(110deg, #ffffff 0%, #e8c07a 40%, #e2674a 68%, #8b7cf0 100%)";
export const GRAD_COOL = "linear-gradient(110deg, #56b6e8, #8b7cf0)";
