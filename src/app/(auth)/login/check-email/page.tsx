export const metadata = { title: "Check your email · Life OS" };

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Check your email
        </h1>
        <p className="text-sm text-zinc-400">
          We just sent you a magic link. Open it on this device to sign in.
        </p>
      </div>
    </div>
  );
}
