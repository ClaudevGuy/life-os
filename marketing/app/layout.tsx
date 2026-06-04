import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./tailwind.css";
import "./globals.css";

const sans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});
const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Life OS — the operating system for your life",
  description:
    "Plan, track, and recall everything you care about in one beautiful, private, local-first app. Tasks, habits, goals, health, finance, an encrypted vault, agentic AI, and more.",
  metadataBase: new URL("https://life-os.example.com"),
  openGraph: {
    title: "Life OS — the operating system for your life",
    description:
      "One private, local-first app for your tasks, habits, goals, health, money, secrets, and an AI that actually acts.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body style={{ margin: 0, background: "#070710" }}>
        <div className="lp-root">{children}</div>
      </body>
    </html>
  );
}
