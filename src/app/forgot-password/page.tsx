"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";
import { Auth } from "@/lib/api";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await Auth.forgotPassword(email);
    setLoading(false);
    if (res.ok && res.data.success) {
      setSent(true);
    } else {
      setError(res.data.message || "Erreur lors de l'envoi");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7f5] px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <Shield className="h-7 w-7 text-[#009e49]" />
          <span className="font-display text-xl font-semibold text-[#172033]">
            SafeStay
          </span>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-8 shadow-sm">
          {sent ? (
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-[#172033]">
                E-mail envoyé
              </h2>
              <p className="mt-3 text-sm text-[#172033]/50">
                Si un compte existe avec cette adresse, vous recevrez un lien
                de réinitialisation.
              </p>
              <Link href="/login" className="mt-6 inline-block">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4" />
                  Retour à la connexion
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl font-bold text-[#172033]">
                Mot de passe oublié
              </h2>
              <p className="mt-2 text-sm text-[#172033]/50">
                Entrez votre e-mail pour recevoir un lien de réinitialisation.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}
                <Input
                  id="email"
                  label="Adresse e-mail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                />
                <Button type="submit" className="w-full" loading={loading}>
                  Envoyer le lien
                </Button>
              </form>

              <Link
                href="/login"
                className="mt-6 flex items-center justify-center gap-1.5 text-sm text-[#009e49] hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour à la connexion
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
