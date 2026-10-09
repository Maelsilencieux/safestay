"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  LayoutDashboard,
  Hotel,
  Users,
  FileText,
  LogOut,
  Building2,
  Clock3,
  Landmark,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Admin } from "@/lib/api";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";

export default function AdminDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    hotels: 0,
    clients: 0,
    fiches: 0,
    pendingHotels: 0,
  });
  const [loading, setLoading] = useState(true);

  // useEffect(() => { if (!authLoading) { if (!user) router.push("/login"); else if (user.role !== "admin") router.push("/fiche"); } }, [user, authLoading, router]);
  useEffect(() => {
    async function load() {
      const res = await Admin.stats();
    
      if (res.ok && res.data.success) {
        const d = res.data.stats;
        console.log(d);
        setStats({
          hotels: d.totalHotels || 0,
          clients: d.totalClients || 0,
          fiches: d.totalFiches || 0,
          pendingHotels: d.hotelsPending || 0,
        });
      }
      setLoading(false);
    }

    if (user) load();
  }, [user]);

  if (authLoading || loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#009e49] border-t-transparent" />
      </div>
    );

  const cards = [
    {
      label: "Établissements enregistrés",
      value: stats.hotels,
      icon: Building2,
      tone: "bg-emerald-50 text-[#007f3b]",
    },
    {
      label: "Établissements à valider",
      value: stats.pendingHotels,
      icon: Clock3,
      tone: "bg-yellow-50 text-yellow-700",
    },
    {
      label: "Usagers",
      value: stats.clients,
      icon: Users,
      tone: "bg-slate-100 text-slate-700",
    },
    {
      label: "Fiches d'enregistrement",
      value: stats.fiches,
      icon: FileText,
      tone: "bg-red-50 text-[#c51f25]",
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-black/10 bg-white">
        <div className="burkina-stripe" />
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-burkina-green text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-burkina-red">
                Burkina Faso
              </p>
              <p className="font-bold text-slate-900">SafeStay</p>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <Landmark className="mr-1 inline h-3.5 w-3.5" /> Administration de
            la plateforme
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-5">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Pilotage
          </p>
          {[
            {
              href: "/admin/dashboard",
              icon: LayoutDashboard,
              label: "Tableau de bord",
            },
            { href: "/admin/hotels", icon: Hotel, label: "Hotels" },
            { href: "/admin/clients", icon: Users, label: "utilisateurs" },
            {
              href: "/admin/fiches",
              icon: FileText,
              label: "Fiches hôtelières",
            },
            {
              href: "/admin/documents",
              icon: FileText,
              label: "Documents et pièces d'identité",
            },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg border-l-4 px-4 py-3 text-sm font-medium transition",
                item.href === "/admin/dashboard"
                  ? "border-burkina-green bg-burkina-green/10 text-burkina-green"
                  : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </a>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-4">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-500 hover:bg-red-50 hover:text-burkina-red"
          >
            <LogOut className="h-5 w-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="ml-72 flex-1">
        <header className="border-b border-slate-200 bg-white">
          <div className="burkina-stripe" />
          <div className="flex items-center justify-between px-8 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-burkina-red">
                Portail institutionnel
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                Tableau de bord administratif
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Suivi national des établissements et des fiches
                d&apos;enregistrement.
              </p>
            </div>
            <div className="hidden rounded-lg border border-slate-200 px-4 py-2 text-right sm:block">
              <p className="text-xs text-slate-400">Session</p>
              <p className="text-sm font-semibold text-slate-700">
                Administrateur
              </p>
            </div>
          </div>
        </header>
        <div className="institutional-grid min-h-[calc(100vh-105px)] p-8">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((c) => (
              <div
                key={c.label}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      {c.label}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {c.value}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-lg",
                      c.tone,
                    )}
                  >
                    <c.icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-7 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-burkina-green">
                    Gestion
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">
                    Actions administratives
                  </h2>
                </div>
                <Landmark className="h-6 w-6 text-slate-300" />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Button onClick={() => router.push("/admin/hotels")}>
                  <Hotel className="h-4 w-4" />
                  Valider les établissements
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/admin/fiches")}
                >
                  <FileText className="h-4 w-4" />
                  Consulter les fiches
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/admin/clients")}
                >
                  <Users className="h-4 w-4" />
                  Gérer les usagers
                </Button>
              </div>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-burkina-red">
                Priorité
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">
                Dossiers en attente
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {stats.pendingHotels} établissement
                {stats.pendingHotels !== 1 ? "s" : ""} nécessite
                {stats.pendingHotels !== 1 ? "nt" : ""} actuellement une
                vérification administrative.
              </p>
              <button
                onClick={() => router.push("/admin/hotels")}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-burkina-green hover:underline"
              >
                Accéder aux validations <ArrowRight className="h-4 w-4" />
              </button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
