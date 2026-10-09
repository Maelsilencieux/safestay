"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import InstitutionalFooter from "@/components/layout/InstitutionalFooter";
import Input from "@/components/ui/Input";

import InstutionalHeader from "@/components/layout/InstitutionalHeader";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await login(email, password);
    if (!res.success) setError(res.message || "Erreur de connexion");
    setLoading(false);
  }

  return (
    <>
    
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="burkina-stripe" />
      <div className="border-b border-slate-200 bg-white px-6 py-3 text-center text-xs font-semibold text-slate-600">République du MALI · SafeStay · Portail sécurisé</div>
      <div className="flex flex-1">
      {/* Left panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-[#007f3b] via-[#009e49] to-[#006d32] p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <Shield className="h-8 w-8 text-[#fcd116]" />
          <span className="font-display text-2xl font-semibold">SafeStay</span>
        </div>
        <div>
          <h1 className="font-display text-4xl font-bold leading-tight">
            Bienvenue sur votre
            <span className="block text-[#fcd116]">espace sécurisé</span>
          </h1>
          <p className="mt-4 max-w-md text-white/60">
            Connectez-vous pour remplir votre fiche d&apos;enregistrement ou
            gérer votre établissement hôtelier.
          </p>
        </div>
        <p className="text-sm text-white/30">
          © {new Date().getFullYear()} SafeStay — République du MALI
        </p>
      </div>

      {/* Right form */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <Shield className="h-7 w-7 text-[#fcd116]" />
            <span className="font-display text-xl font-semibold text-[#172033]">
              SafeStay
            </span>
          </div>

          <h2 className="font-display text-3xl font-bold text-[#172033]">
            Connexion
          </h2>
          <p className="mt-2 text-sm text-[#172033]/50">
            Entrez vos identifiants pour continuer
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="relative">
              <Input
                id="password"
                label="Mot de passe"
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
                {showPwd ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-[#fcd116] hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Se connecter
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-[#172033]/50">
            Pas encore de compte ?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#fcd116] hover:underline"
            >
              Créer un compte
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
