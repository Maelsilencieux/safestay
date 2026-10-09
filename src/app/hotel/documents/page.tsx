"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  FileText,
  Download,
  ExternalLink,
  FolderOpen,
  ArrowLeft,
  LoaderCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Fiches, getToken } from "@/lib/api";
import type { Fiche } from "@/types";
import HotelSidebar from "@/components/layout/HotelSidebar";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";

import InstitutionalHeader from "@/components/layout/InstitutionalHeader";
import InstitutionalFooter from "@/components/layout/InstitutionalFooter";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/backend";

function extractFiches(data: unknown): Fiche[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.fiches)) return d.fiches as Fiche[];
  if (Array.isArray(d.data)) return d.data as Fiche[];
  if (Array.isArray(data)) return data as Fiche[];
  return [];
}

export default function HotelDocumentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [docs, setDocs] = useState<Fiche[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading) {
      if (!user) router.push("/login");
      else if (user.role !== "hotel" && user.role !== "admin")
        router.push("/fiche");
    }
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await Fiches.hotelDocuments();
    if (res.ok && res.data.success !== false) {
      setDocs(extractFiches(res.data));
    } else {
      const res2 = await Fiches.hotelFiches();
      if (res2.ok) {
        const all = extractFiches(res2.data);
        setDocs(all.filter((f) => f.statut !== "pending"));
      } else {
        setError((res.data as any)?.message || "Erreur de chargement");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return docs;
    const q = search.toLowerCase();
    return docs.filter((d) =>
      `${d.nom} ${d.prenom} ${d.nationalite || ""} ${
        d.chambreNumero || (d as any).chambre || ""
      } ${d.reference || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [docs, search]);

  async function telecharger(
    ficheId: string,
    type: "cnib" | "fiche-pdf",
    filename: string
  ) {
    try {
      const token = getToken() || localStorage.getItem("ss_token");
      const endpoint =
        type === "cnib"
          ? `${API_BASE}/fiches/${ficheId}/cnib`
          : `${API_BASE}/fiches/${ficheId}/fiche-pdf/download`;

      const response = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Téléchargement impossible");
      }

      const blob = await response.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur de téléchargement"
      );
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#009e49] border-t-transparent" />
      </div>
    );
  }

  return (
    <>
    <InstitutionalHeader />
    <div className="flex min-h-screen bg-[#f5f7f5]">
      <HotelSidebar />

      <main className="ml-64 flex-1 p-8">
        <button
          onClick={() => router.push("/hotel/dashboard")}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Retour au tableau de bord
        </button>

        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-[#172033]">
            Documents
          </h1>
          <p className="mt-1 text-sm text-[#172033]/50">
            Pièces d&apos;identité et fiches hôtelières PDF archivées
            (téléchargement persistant)
          </p>
        </div>

        <div className="mb-6 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />
          <input
            type="text"
            placeholder="Rechercher un client, une référence…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#009e49] focus:ring-2 focus:ring-[#009e49]/20"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <LoaderCircle className="h-8 w-8 animate-spin text-[#009e49]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 bg-white py-20">
            <FolderOpen className="mb-4 h-12 w-12 text-black/20" />
            <p className="text-[#172033]/50">Aucun document disponible</p>
            <p className="mt-1 text-xs text-black/30">
              Les documents apparaissent ici après validation et
              téléchargement des fiches.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-black/[0.02] text-xs uppercase tracking-wide text-black/40">
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">
                    Hôtel / Chambre
                  </th>
                  <th className="px-5 py-3 font-medium">Statut</th>
                  <th className="hidden px-5 py-3 font-medium lg:table-cell">
                    Date
                  </th>
                  <th className="px-5 py-3 font-medium text-right">
                    Documents
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr
                    key={d._id}
                    className="border-b border-black/5 transition hover:bg-black/[0.015]"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-[#172033]">
                        {d.prenom} {d.nom}
                      </div>
                      {d.reference && (
                        <div className="text-xs text-black/30">
                          {d.reference}
                        </div>
                      )}
                      {d.nationalite && (
                        <div className="text-xs text-black/40">
                          {d.nationalite}
                        </div>
                      )}
                    </td>
                    <td className="hidden px-5 py-3.5 md:table-cell">
                      <div>{(d as any).hotel?.nomHotel || "—"}</div>
                      <div className="text-xs text-black/40">
                        Ch. {d.chambreNumero || (d as any).chambre || "—"}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge statut={d.statut} />
                    </td>
                    <td className="hidden px-5 py-3.5 text-[#172033]/50 lg:table-cell">
                      {d.createdAt ? formatDate(d.createdAt) : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {(d.pdfFiche ||
                          d.statut === "registered" ||
                          d.statut === "transmitted") && (
                          <button
                            onClick={() =>
                              telecharger(
                                d._id,
                                "fiche-pdf",
                                `Fiche_${d.reference || d._id}.pdf`
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-medium text-[#172033]/70 transition hover:bg-black/5"
                            title="Télécharger la fiche PDF officielle"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Fiche PDF
                            <Download className="h-3 w-3" />
                          </button>
                        )}

                        {d.cnibFichier && (
                          <button
                            onClick={() =>
                              telecharger(
                                d._id,
                                "cnib",
                                `CNIB_${d.nom}_${d.prenom}.pdf`
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-medium text-[#172033]/70 transition hover:bg-black/5"
                            title="Télécharger la pièce d'identité"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            CNIB
                            <Download className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
    <InstitutionalFooter/>
    </>
  );
}