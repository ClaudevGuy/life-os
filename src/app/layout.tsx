import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
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
  title: {
    default: "Life OS",
    template: "%s · Life OS",
  },
  description:
    "Capture, organize, and recall everything you care about — local-first.",
  manifest: "/manifest.webmanifest",
  applicationName: "Life OS",
  appleWebApp: {
    capable: true,
    title: "Life OS",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F1E8" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1612" },
  ],
  colorScheme: "light dark",
};

// Run before paint to avoid flash. Reads theme from localStorage and sets
// data-theme on <html>. Defaults to "dark".
const THEME_BOOT_SCRIPT = `
(function(){
  try {
    var t = localStorage.getItem('lifeos.theme') || 'dark';
    document.documentElement.dataset.theme = t;
  } catch(e) {
    document.documentElement.dataset.theme = 'dark';
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full" style={{ background: "var(--bg)", color: "var(--ink)" }}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast:
                "!bg-[var(--paper)] !text-[var(--ink)] !border !border-[var(--line-2)] !rounded-xl !shadow-xl",
              description: "!text-[var(--muted)]",
              actionButton: "!bg-[var(--terra)] !text-[var(--paper)]",
              cancelButton: "!bg-[var(--paper-2)] !text-[var(--muted)]",
            },
          }}
        />
      </body>
    </html>
  );
}
