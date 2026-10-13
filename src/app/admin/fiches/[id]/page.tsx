"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/backend";

function formatDate(v?: string) {
  return v ? new Date(v).toLocaleDateString("fr-FR") : "—";
}

export default function AdminFicheDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [fiche, setFiche] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function charger() {
      try {
        const token = localStorage.getItem("ss_token");
        const res = await fetch(`${API_BASE}/fiches/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) {
          throw new Error(data.message || `Erreur HTTP ${res.status}`);
        }
        setFiche(data.fiche);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chargement impossible.");
      } finally {
        setLoading(false);
      }
    }
    if (id) charger();
  }, [id]);

  async function ouvrir(path: string) {
    const onglet = window.open("about:blank", "_blank");
    if (!onglet) {
      setError("Autorisez les pop-up pour consulter le document.");
      return;
    }
    try {
      const token = localStorage.getItem("ss_token");
      const res = await fetch(`${API_BASE}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || "Impossible d'ouvrir le document.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      onglet.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      onglet.close();
      setError(e instanceof Error ? e.message : "Erreur.");
    }
  }

  if (loading) return <p className="p-8 text-slate-500">Chargement...</p>;

  const champs: [string, string | undefined][] = fiche
    ? [
        ["Référence", fiche.reference],
        ["Statut", fiche.statut],
        ["Nom", fiche.nom],
        ["Prénom", fiche.prenom],
        ["Date de naissance", formatDate(fiche.dateNaissance)],
        ["Lieu de naissance", fiche.lieuNaissance],
        ["Nationalité", `${fiche.nationalite || ""} ${fiche.flagEmoji || ""}`],
        ["Profession", fiche.profession],
        [
          "Adresse",
          `${fiche.adresse || ""}, ${fiche.ville || ""}${
            fiche.bp ? ` — BP ${fiche.bp}` : ""
          }`,
        ],
        ["Type de pièce", fiche.typePiece],
        ["N° de pièce", fiche.numeroPiece],
        ["Délivrée le", formatDate(fiche.delivreLe)],
        ["Délivrée à", fiche.delivreA],
        ["Hôtel", `${fiche.hotel?.nomHotel || "—"} (${fiche.hotel?.ville || ""})`],
        ["Chambre", fiche.chambreNumero],
        ["Date d'entrée", formatDate(fiche.dateEntree)],
        ["Date de sortie", formatDate(fiche.dateSortie)],
        ["Venant de", fiche.venantDe],
        ["Allant à", fiche.allantA],
        ["Motif", fiche.motif],
        [
          "Transport",
          `${fiche.transport || "—"}${fiche.plaque ? ` (${fiche.plaque})` : ""}`,
        ],
        ["Paiement", fiche.modePaiement],
        ["Client (e-mail)", fiche.client?.email],
      ]
    : [];

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href="/admin/fiches"
          className="inline-block rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
        >
          ← Retour aux fiches
        </Link>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {fiche && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-bold text-slate-900">
                Fiche {fiche.reference}
              </h1>
              <div className="flex gap-2">
                {fiche.cnibFichier && (
                  <button
                    onClick={() => ouvrir(`/admin/documents/${fiche._id}/view`)}
                    className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-100"
                  >
                    Voir la pièce
                  </button>
                )}
                {fiche.pdfFiche && (
                  <button
                    onClick={() => ouvrir(`/admin/documents/${fiche._id}/fiche`)}
                    className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100"
                  >
                    Fiche PDF
                  </button>
                )}
              </div>
            </div>

            <dl className="grid gap-4 rounded-xl border bg-white p-6 sm:grid-cols-2">
              {champs.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs uppercase text-slate-500">{k}</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </div>
    </main>
  );
}