"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  FileText,
  LogOut,
  Plus,
  Calendar,
  Hotel,
  BedDouble,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Fiches } from "@/lib/api";
import type { Fiche } from "@/types";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";

function extractFiches(data: unknown): Fiche[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.fiches)) return d.fiches as Fiche[];
  if (Array.isArray(d.data)) return d.data as Fiche[];
  if (Array.isArray(data)) return data as Fiche[];
  return [];
}

export default function MesFichesPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await Fiches.mesFiches();
      if (res.ok && res.data.success !== false) {
        setFiches(extractFiches(res.data));
      } else {
        setError(res.data.message || "Impossible de charger vos fiches.");
      }
      setLoading(false);
    }
    if (user) load();
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#009e49] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f5]">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-[#009e49]" />
            <span className="font-display text-lg font-semibold text-[#172033]">
              SafeStay
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-[#172033]/60 sm:inline">
              Bonjour, <strong>{user?.prenom || "Visiteur"}</strong>
            </span>
            <Link href="/fiche">
              <Button size="sm">
                <Plus className="h-4 w-4" />
                Nouvelle fiche
              </Button>
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[#172033]/50 transition hover:bg-black/5"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-[#172033]">
              Mes fiches
            </h1>
            <p className="mt-1 text-sm text-[#172033]/50">
              Historique de vos fiches d&apos;enregistrement
            </p>
          </div>
          <span className="rounded-full bg-black/5 px-3 py-1 text-sm font-medium text-[#172033]/60">
            {fiches.length} fiche{fiches.length !== 1 ? "s" : ""}
          </span>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#009e49] border-t-transparent" />
          </div>
        ) : fiches.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 bg-white py-20">
            <FileText className="mb-4 h-12 w-12 text-black/20" />
            <p className="text-[#172033]/50">Aucune fiche pour le moment</p>
            <Link href="/fiche" className="mt-4">
              <Button>
                <Plus className="h-4 w-4" />
                Créer ma première fiche
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {fiches.map((f) => {
              const hotelName =
                typeof f.hotel === "object" && f.hotel && "nomHotel" in f.hotel
                  ? f.hotel.nomHotel
                  : "—";
              const chambre = f.chambreNumero || f.chambre || "—";
              const arrivee = f.dateEntree || f.dateArrivee;
              const depart = f.dateSortie || f.dateDepart;

              return (
                <div
                  key={f._id}
                  className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg font-semibold text-[#172033]">
                        {f.prenom} {f.nom}
                      </span>
                      <StatusBadge statut={f.statut} />
                      {f.reference && (
                        <span className="text-xs text-black/30">
                          Réf. {f.reference}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#172033]/55">
                      <span className="inline-flex items-center gap-1.5">
                        <Hotel className="h-3.5 w-3.5" />
                        {hotelName}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <BedDouble className="h-3.5 w-3.5" />
                        Ch. {chambre}
                      </span>
                      {arrivee && (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(arrivee)}
                          {depart ? ` → ${formatDate(depart)}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-black/30">
                    Créée le {formatDate(f.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
