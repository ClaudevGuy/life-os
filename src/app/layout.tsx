import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Life OS",
  description: "Capture, organize, and recall everything you care about.",
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
      className={`${inter.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full" style={{ background: "var(--bg-app)", color: "var(--text)" }}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast:
                "!bg-[var(--bg-card)] !text-[var(--text)] !border !border-[var(--border-strong)] !rounded-lg !shadow-xl",
              description: "!text-[var(--text-muted)]",
              actionButton: "!bg-[var(--accent)] !text-zinc-950",
              cancelButton: "!bg-[var(--bg-card-hover)] !text-[var(--text-muted)]",
            },
          }}
        />
      </body>
    </html>
  );
}
