
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Hotel,
  Users,
  FileText,
  Building2,
  Clock3,
  Landmark,
  ArrowRight,
} from "lucide-react";

import InstitutionalHeader from "@/components/layout/InstitutionalHeader";
import InstitutionalFooter from "@/components/layout/InstitutionalFooter";
import { useAuth } from "@/context/AuthContext";
import { Admin } from "@/lib/api";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";

type AdminStats = {
  totalHotels?: number;
  totalClients?: number;
  totalFiches?: number;
  hotelsPending?: number;
};

type DashboardStats = {
  hotels: number;
  clients: number;
  fiches: number;
  pendingHotels: number;
};

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats>({
    hotels: 0,
    clients: 0,
    fiches: 0,
    pendingHotels: 0,
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login");
      setLoading(false);
      return;
    }

    if (user.role !== "admin" && user.role !== "superadmin") {
      router.replace("/fiche");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadStats() {
      setLoading(true);
      setMessage(null);

      try {
        const res = await Admin.stats();

        if (!res.ok || !res.data.success) {
          throw new Error(
            res.data.message || "Impossible de charger les statistiques."
          );
        }

        // Le type précise la structure attendue de la réponse.
        const d = res.data.stats as AdminStats;

        if (cancelled) return;

        setStats({
          hotels: d.totalHotels ?? 0,
          clients: d.totalClients ?? 0,
          fiches: d.totalFiches ?? 0,
          pendingHotels: d.hotelsPending ?? 0,
        });
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Erreur lors du chargement des statistiques."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, router]);

  async function handleExport() {
    if (exporting) return;

    setExporting(true);
    setMessage(null);

    try {
      await Admin.exportFiches({ statut: "registered" });

      setMessage("La demande d'export a été exécutée.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "L'export CSV a échoué."
      );
    } finally {
      setExporting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#009e49] border-t-transparent" />
      </div>
    );
  }

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
    <>
      

      <main>
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
          {message && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
            >
              {message}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      {card.label}
                    </p>

                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {card.value}
                    </p>
                  </div>

                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-lg",
                      card.tone
                    )}
                  >
                    <card.icon className="h-5 w-5" />
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

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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

                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileText className="h-4 w-4" />
                  {exporting ? "Export en cours..." : "Exporter en CSV"}
                </button>
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
                type="button"
                onClick={() => router.push("/admin/hotels")}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-burkina-green hover:underline"
              >
                Accéder aux validations
                <ArrowRight className="h-4 w-4" />
              </button>
            </section>
          </div>
        </div>
      </main>

      <InstitutionalFooter />
    </>
  );
}
