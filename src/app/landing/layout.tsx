import type { Metadata } from "next";
import "./landing.css";

export const metadata: Metadata = {
  title: "Life OS — the operating system for your life",
  description:
    "Plan, track, and recall everything you care about in one beautiful, private, local-first app. Tasks, habits, goals, health, finance, an encrypted vault, agentic AI, and more.",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="lp-root">{children}</div>;
}
