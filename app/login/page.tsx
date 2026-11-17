import Link from "next/link";
import { login } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; registered?: string }> }) {
  const params = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <Link href="/" className="mb-8 text-sm font-bold text-forest">← AgriConnect</Link>
      <div className="rounded-3xl border border-emerald-900/10 bg-white p-7 shadow-soft">
        <h1 className="text-2xl font-bold text-forest">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in to manage your harvest or find local produce.</p>
        {params.registered && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Account created. Check your email if confirmation is required, then sign in.</p>}
        {params.error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">We could not sign you in. Check your details and try again.</p>}
        <form action={login} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-slate-700">Email<Input name="email" type="email" autoComplete="email" required placeholder="you@example.com" className="mt-2" /></label>
          <label className="block text-sm font-semibold text-slate-700">Password<Input name="password" type="password" autoComplete="current-password" required minLength={8} className="mt-2" /></label>
          <Button type="submit" className="w-full">Sign in</Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">New to AgriConnect? <Link href="/register" className="font-bold text-leaf">Create an account</Link></p>
      </div>
    </main>
  );
}
