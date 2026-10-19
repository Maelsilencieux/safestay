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
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Fiches, getToken } from "@/lib/api";
import type { Fiche } from "@/types";
import StatusBadge from "@/components/ui/StatusBadge";
import Pagination from "@/components/ui/Pagination";
import { formatDate } from "@/lib/utils";
import ConfirmModal from "@/components/ui/ConfirmModal"; // Remplacez par le nom/chemin exact de votre modale

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/backend";
const PAGE_SIZE = 10;

function extractFiches(data: unknown): Fiche[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.fiches)) return d.fiches as Fiche[];
  if (Array.isArray(d.data)) return d.data as Fiche[];
  if (Array.isArray(data)) return data as Fiche[];
  return [];
}

export default function HotelDocumentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [docs, setDocs] = useState<Fiche[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // État de la modale de confirmation personnalisée
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    type: "danger" | "warning" | "info";
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirmer",
    type: "danger",
    onConfirm: () => {},
  });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const res = await Fiches.hotelDocuments({
      page: String(page),
      limit: String(PAGE_SIZE),
    });

    if (res.ok && res.data.success !== false) {
      const d = res.data as any;
      const fiches = extractFiches(res.data);
      const pages = d.pages || 1;

      // Si on a supprimé la dernière fiche de la page, on recule d'une page
      if (fiches.length === 0 && page > 1) {
        setPage(page - 1);
        return;
      }

      setDocs(fiches);
      setTotalPages(pages);
      setTotal(d.total || 0);
    } else {
      setDocs([]);
      setError((res.data as any)?.message || "Erreur de chargement");
    }
    setLoading(false);
  }, [page]);

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
        .includes(q),
    );
  }, [docs, search]);

  async function telecharger(
    ficheId: string,
    type: "cnib" | "fiche-pdf",
    filename: string,
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de téléchargement");
    }
  }

  // Remplacement de window.confirm par le composant ConfirmModal
  function demanderSuppression(d: Fiche) {
    setModalConfig({
      isOpen: true,
      title: "Suppression définitive",
      message:
        `Supprimer définitivement la fiche de ${d.prenom} ${d.nom} ` +
        `avec sa pièce d'identité et son formulaire PDF ?\nCette action est irréversible.`,
      confirmText: "Supprimer",
      type: "danger",
      onConfirm: async () => {
        setDeletingId(d._id);
        setError("");

        try {
          const token = getToken() || localStorage.getItem("ss_token");
          const response = await fetch(`${API_BASE}/fiches/hotel/supprimer`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ ficheIds: [d._id] }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || data.success === false) {
            throw new Error(data.message || "Suppression impossible");
          }
          await load();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur de suppression");
        } finally {
          setDeletingId(null);
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  }

  return (
    <div className="p-4 md:p-8">
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
          Pièces d&apos;identité et formulaires PDF archivés (téléchargement
          persistant)
        </p>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />
        <input
          type="text"
          placeholder="Rechercher dans cette page…"
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
            Les documents apparaissent ici après validation et téléchargement
            des fiches.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <div className="overflow-x-auto">
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
                  <th className="px-5 py-3 text-right font-medium">
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
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {/* Formulaire PDF : vert */}
                        {(d.pdfFiche ||
                          d.statut === "registered" ||
                          d.statut === "transmitted") && (
                          <button
                            onClick={() =>
                              telecharger(
                                d._id,
                                "fiche-pdf",
                                `Fiche_${d.reference || d._id}.pdf`,
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700"
                            title="Télécharger le formulaire (fiche PDF officielle)"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Formulaire PDF
                            <Download className="h-3 w-3" />
                          </button>
                        )}

                        {/* Pièce d'identité : bleu */}
                        {d.cnibFichier && (
                          <button
                            onClick={() =>
                              telecharger(
                                d._id,
                                "cnib",
                                `CNIB_${d.nom}_${d.prenom}.pdf`,
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
                            title="Télécharger la pièce d'identité"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Pièce d&apos;identité
                            <Download className="h-3 w-3" />
                          </button>
                        )}

                        {/* Supprimer : rouge */}
                        <button
                          disabled={deletingId === d._id}
                          onClick={() => demanderSuppression(d)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                          title="Supprimer la fiche et tous ses documents"
                        >
                          {deletingId === d._id ? (
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
            total={total}
          />
        </div>
      )}

      {/* Intégration du composant ConfirmModal */}
      <ConfirmModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        cancelText="Annuler"
        type={modalConfig.type}
        loading={!!deletingId}
      />
    </div>
  );
}