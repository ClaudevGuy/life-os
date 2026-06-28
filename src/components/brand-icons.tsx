import type { Channel } from "@/lib/messaging/types";

/** Brand logos for the messaging channels, as inline SVG so they stay crisp
 *  and theme-independent. Sized via the `size` prop (square). */

export function GmailIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path fill="#4caf50" d="M45 16.2l-5 2.75-5 4.75L35 40h7c1.657 0 3-1.343 3-3V16.2z" />
      <path fill="#1e88e5" d="M3 16.2l3.614 1.71L13 23.7V40H6c-1.657 0-3-1.343-3-3V16.2z" />
      <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17" />
      <path fill="#c62828" d="M3 12.298V16.2l10 7.5V11.2L9.876 8.859C9.132 8.301 8.228 8 7.298 8 4.924 8 3 9.924 3 12.298z" />
      <path fill="#fbc02d" d="M45 12.298V16.2l-10 7.5V11.2l3.124-2.341C38.868 8.301 39.772 8 40.702 8 43.076 8 45 9.924 45 12.298z" />
    </svg>
  );
}

const MAP: Record<Channel, (p: { size?: number }) => React.ReactElement> = {
  gmail: GmailIcon,
};

export function BrandLogo({ channel, size = 24 }: { channel: Channel; size?: number }) {
  // Tolerate stale rows from a removed channel (e.g. leftover Telegram data) so
  // the inbox never renders a missing logo and crashes.
  const Logo = MAP[channel];
  if (!Logo) return null;
  return <Logo size={size} />;
}
