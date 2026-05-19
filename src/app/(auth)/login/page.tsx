import { signIn } from "@/auth";

export const metadata = { title: "Sign in · Life OS" };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Life OS</h1>
        <p className="text-sm text-zinc-400 mb-8">
          Sign in with your email. We&apos;ll send you a magic link.
        </p>

        <form
          action={async (formData) => {
            "use server";
            await signIn("resend", { email: formData.get("email") });
          }}
          className="space-y-3"
        >
          <input
            type="email"
            name="email"
            required
            placeholder="you@domain.com"
            className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-zinc-100 text-zinc-900 px-3 py-2 text-sm font-medium hover:bg-white transition"
          >
            Send magic link
          </button>
        </form>
      </div>
    </div>
  );
}
