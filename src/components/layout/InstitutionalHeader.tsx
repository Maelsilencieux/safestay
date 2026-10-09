"use client";

import Link from "next/link";
import { ShieldCheck, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function InstitutionalHeader() {
  const { user, logout } = useAuth();

  return (
    <>
      <div className="burkina-stripe" aria-hidden="true" />
      <header className="sticky top-0 z-50 border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-3 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-burkina-green text-white shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-burkina-red">République du MALI</p>
              <p className="text-sm font-bold text-slate-900">SafeStay</p>
              <p className="hidden text-[10px] text-slate-500 sm:block">Plateforme numérique des fiches hôtelières</p>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-600 md:block">Service public numérique</span>
            {user && (
              <button onClick={logout} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-600 transition hover:border-burkina-red hover:text-burkina-red">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
