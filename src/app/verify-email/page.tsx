"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, MailCheck } from "lucide-react";

import { Auth, saveSession } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") || "";

  const { refreshUser } = useAuth();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cooldown, setCooldown] = useState(60); // un code vient d'être envoyé
  const [done, setDone] = useState<{ role?: string; message: string } | null>(
    null,
  );

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!/^\d{6}$/.test(code)) {
      setError("Saisissez le code à 6 chiffres reçu par e-mail.");
      return;
    }

    setLoading(true);
    const res = await Auth.verifyEmail(email, code);
    setLoading(false);

        if (res.ok && res.data.success) {
      const d = res.data as any;
      setDone({ role: d.role, message: d.message });

      if (d.loggedIn && d.token && d.user) {
        saveSession(d.token, d.user); // enregistre la session
        await refreshUser();          // met à jour le contexte d'authentification
        setTimeout(() => router.push("/fiche"), 1500);
      }
      // Hôtel : pas de session, il reste sur l'écran de confirmation
    } else {
      setError(res.data?.message || "Vérification impossible.");
    }
  }

  async function handleResend() {
    setError("");
    setInfo("");
    const res = await Auth.resendCode(email);
    if (res.ok) {
      setInfo("Un nouveau code vient d'être envoyé.");
      setCooldown(60);
    } else {
      setError(res.data?.message || "Impossible de renvoyer le code.");
    }
  }

  if (!email) {
    return (
      <p className="text-center text-sm text-[#172033]/60">
        Adresse e-mail manquante.{" "}
        <Link href="/register" className="font-semibold text-[#009e49]">
          Retour à l&apos;inscription
        </Link>
      </p>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <MailCheck className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="font-display text-2xl font-bold text-[#172033]">
          E-mail vérifié
        </h2>
        <p className="mt-2 text-sm text-[#172033]/60">{done.message}</p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-semibold text-[#009e49] hover:underline"
        >
          Aller à la connexion
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="font-display text-center text-2xl font-bold text-[#172033]">
        Vérifiez votre e-mail
      </h2>
      <p className="mt-2 text-center text-sm text-[#172033]/60">
        Un code à 6 chiffres a été envoyé à{" "}
        <span className="font-semibold">{email}</span>. Il est valable 10
        minutes.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        {info && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {info}
          </div>
        )}

        <Input
          id="code"
          label="Code de vérification"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="123456"
        />

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Valider
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[#172033]/60">
        Pas reçu ?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0}
          className="font-semibold text-[#009e49] hover:underline disabled:cursor-not-allowed disabled:text-black/30 disabled:no-underline"
        >
          {cooldown > 0 ? `Renvoyer le code (${cooldown}s)` : "Renvoyer le code"}
        </button>
      </p>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#f5f7f5] px-6 py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <Shield className="h-7 w-7 text-[#009e49]" />
          <span className="font-display text-xl font-semibold text-[#172033]">
            SafeStay
          </span>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-8 shadow-sm">
          <Suspense fallback={<p className="text-center">Chargement...</p>}>
            <VerifyEmailForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}