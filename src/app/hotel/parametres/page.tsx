"use client";

import { Settings, UserRound, ShieldCheck } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import ChangePasswordForm from "@/components/hotel/ChangePasswordForm";

export default function ParametresPage() {
  const { user } = useAuth();

  return (
    <div className="p-8">
      <div className="mb-8 border-b border-slate-200 pb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-burkina-red">
          Portail établissement
        </p>
        <h1 className="flex items-center gap-3 font-display text-3xl font-bold text-slate-900">
          <Settings className="h-7 w-7" /> Paramètres
        </h1>
        <p className="mt-1 text-sm text-slate-900/50">
          Gérez les informations et la sécurité de votre compte.
        </p>
      </div>

      <div className="space-y-6">
        {/* Informations du compte (lecture seule) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-slate-900">
            <UserRound className="h-5 w-5 text-slate-500" /> Informations du compte
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Établissement
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                {(user as any)?.nomHotel || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">
                E-mail
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                {(user as any)?.email || "—"}
              </dd>
            </div>
          </dl>
        </section>

        {/* Sécurité */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold text-slate-900">
            <ShieldCheck className="mr-2 inline h-5 w-5 text-slate-500" />
            Sécurité
          </h2>
          <p className="mb-5 mt-1 text-sm text-slate-900/50">
            Modifier mon mot de passe. Choisissez un mot de passe que vous
            n&apos;utilisez nulle part ailleurs.
          </p>
          <ChangePasswordForm />
        </section>
      </div>
    </div>
  );
}