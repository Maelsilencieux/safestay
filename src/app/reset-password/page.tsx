"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import InstitutionalFooter from "@/components/layout/InstitutionalFooter";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1. Vérification automatique du token au chargement
  useEffect(() => {
    async function verifyToken() {
      if (!token || !email) {
        setVerifying(false);
        setTokenValid(false);
        setStatusMsg("Lien de réinitialisation invalide ou incomplet.");
        return;
      }

      try {
        const res = await fetch(
          `http://localhost:5000/api/auth/verify-reset-token?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
        );
        const data = await res.json();

        console.log(data)

        if (res.ok && data.success) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          setStatusMsg(data.message || "Le lien est invalide ou a expiré.");
        }
      } catch (err) {
     
        setTokenValid(false);
        setStatusMsg("Erreur lors de la vérification du lien.");
      } finally {
        setVerifying(false);
      }
    }

    verifyToken();
  }, [token, email]);

  // 2. Soumission du nouveau mot de passe
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setError(data.message || "Une erreur est survenue lors de la réinitialisation.");
      }
    } catch (err) {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex min-h-screen flex-col bg-slate-50">
        <div className="burkina-stripe" />
        <div className="border-b border-slate-200 bg-white px-6 py-3 text-center text-xs font-semibold text-slate-600">
          République du MALI · SafeStay · Portail sécurisé
        </div>

        <div className="flex flex-1">
          {/* Left panel */}
          <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-[#007f3b] via-[#009e49] to-[#006d32] p-12 text-white lg:flex">
            <div className="flex items-center gap-2.5">
              <Shield className="h-8 w-8 text-[#fcd116]" />
              <span className="font-display text-2xl font-semibold">SafeStay</span>
            </div>
            <div>
              <h1 className="font-display text-4xl font-bold leading-tight">
                Nouveau <span className="block text-[#fcd116]">mot de passe</span>
              </h1>
              <p className="mt-4 max-w-md text-white/60">
                Sécurisez l&apos;accès à votre compte en choisissant un mot de passe robuste d&apos;au moins 8 caractères.
              </p>
            </div>
            <p className="text-sm text-white/30">
              © {new Date().getFullYear()} SafeStay — République du MALI
            </p>
          </div>

          {/* Right panel */}
          <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
            <div className="w-full max-w-md">
              <div className="mb-8 flex items-center gap-2 lg:hidden">
                <Shield className="h-7 w-7 text-[#fcd116]" />
                <span className="font-display text-xl font-semibold text-[#172033]">
                  SafeStay
                </span>
              </div>

              <h2 className="font-display text-3xl font-bold text-[#172033]">
                Réinitialisation
              </h2>
              <p className="mt-2 text-sm text-[#172033]/50">
                Saisissez votre nouveau mot de passe
              </p>

              {/* État 1 : Chargement / Vérification */}
              {verifying && (
                <div className="mt-8 flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
                  <Loader2 className="h-5 w-5 animate-spin text-[#007f3b]" />
                  <span>Vérification du lien en cours...</span>
                </div>
              )}

              {/* État 2 : Lien invalide ou expiré */}
              {!verifying && !tokenValid && (
                <div className="mt-8 space-y-6">
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                    <div>
                      <p className="font-semibold">Lien non valide</p>
                      <p className="mt-1 text-red-600/90">{statusMsg}</p>
                    </div>
                  </div>
                  <Link href="/forgot-password">
                    <Button className="w-full" variant="outline">
                      Demander un nouveau lien
                    </Button>
                  </Link>
                </div>
              )}

              {/* État 3 : Succès */}
              {success && (
                <div className="mt-8 space-y-6">
                  <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    <div>
                      <p className="font-semibold">Mot de passe modifié !</p>
                      <p className="mt-1 text-emerald-700/90">
                        Votre mot de passe a été mis à jour avec succès. Vous allez être réorienté vers la page de connexion...
                      </p>
                    </div>
                  </div>
                  <Link href="/login">
                    <Button className="w-full">Se connecter immédiatement</Button>
                  </Link>
                </div>
              )}

              {/* État 4 : Formulaire valide */}
              {!verifying && tokenValid && !success && (
                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <div className="relative">
                    <Input
                      id="password"
                      label="Nouveau mot de passe"
                      type={showPwd ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-[38px] text-black/30 hover:text-black/60"
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      label="Confirmer le mot de passe"
                      type={showConfirmPwd ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                      className="absolute right-3 top-[38px] text-black/30 hover:text-black/60"
                    >
                      {showConfirmPwd ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <Button type="submit" className="w-full" size="lg" loading={loading}>
                    Réinitialiser le mot de passe
                  </Button>
                </form>
              )}

              <p className="mt-8 text-center text-sm text-[#172033]/50">
                Vous vous rappelez de votre mot de passe ?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-[#fcd116] hover:underline"
                >
                  Se connecter
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <InstitutionalFooter />
    </>
  );
}