"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Search,
  FileText,
  Eye,
  CheckCircle2,
  XCircle,
  Send,
  LoaderCircle,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import InstitutionalHeader from "@/components/layout/InstitutionalHeader";
import InstitutionalFooter from "@/components/layout/InstitutionalFooter";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/backend";

type Fiche = {
  _id: string;
  reference?: string;
  nom?: string;
  prenom?: string;
  email?: string;
  numeroPiece?: string;
  typePiece?: string;
  cnibFichier?: string;
  pdfFiche?: string;
  chambreNumero?: string;
  nationalite?: string;
  dateEntree?: string;
  dateSortie?: string;
  createdAt?: string;
  statut: string;
  client?: {
    _id?: string;
    nom?: string;
    prenom?: string;
    email?: string;
  };
};

async function apiRequest(path: string, method = "GET", body?: unknown) {
  const token = localStorage.getItem("ss_token");

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Erreur HTTP ${response.status}`);
  }

  return data;
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR");
}

function statutLabel(statut: string) {
  const labels: Record<string, string> = {
    pending: "En attente",
    registered: "Validée",
    refused: "Refusée",
    transmitted: "Transmise à la police",
  };
  return labels[statut] || statut;
}

export default function HotelFichesPage() {
  const router = useRouter();
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [statut, setStatut] = useState("all");
  const [recherche, setRecherche] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const chargerFiches = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query =
        statut === "all" ? "" : `?statut=${encodeURIComponent(statut)}`;
      const data = await apiRequest(`/fiches/hotel${query}`);
      setFiches(Array.isArray(data.fiches) ? data.fiches : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger les fiches hôtelières."
      );
      setFiches([]);
    } finally {
      setLoading(false);
    }
  }, [statut]);

  useEffect(() => {
    chargerFiches();
  }, [chargerFiches]);

  async function traiterFiche(
    fiche: Fiche,
    action: "valider" | "refuser" | "transmettre-police"
  ) {
    let body: { motif?: string } | undefined;

    if (action === "refuser") {
      const motif = window.prompt(
        "Indique le motif du refus :",
        "Informations non conformes"
      );
      if (motif === null) return;
      body = { motif: motif.trim() || "Informations non conformes" };
    } else {
      const confirmation: Record<string, string> = {
        valider:
          "Confirmer la validation de cette fiche ? Le PDF officiel sera généré.",
        "transmettre-police":
          "Confirmer la transmission de cette fiche à la police ?",
      };
      if (!window.confirm(confirmation[action])) return;
    }

    setActionId(fiche._id);
    setError("");
    setMessage("");

    try {
      const data = await apiRequest(
        `/fiches/${fiche._id}/${action}`,
        "PATCH",
        body
      );
      setMessage(data.message || "Opération effectuée avec succès.");
      await chargerFiches();
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'opération a échoué.");
    } finally {
      setActionId(null);
    }
  }

  async function ouvrirDocument(fiche: Fiche, type: "cnib" | "fiche-pdf") {
    const onglet = window.open("about:blank", "_blank");
    if (!onglet) {
      setError("Autorise les fenêtres pop-up pour consulter le document.");
      return;
    }

    try {
      const token = localStorage.getItem("ss_token");
      const endpoint =
        type === "cnib"
          ? `${API_BASE}/fiches/${fiche._id}/cnib`
          : `${API_BASE}/fiches/${fiche._id}/fiche-pdf/download`;

      const response = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Impossible d'ouvrir le document.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      onglet.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      onglet.close();
      setError(
        err instanceof Error ? err.message : "Erreur lors de la consultation."
      );
    }
  }

  const fichesFiltrees = fiches.filter((fiche) => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return true;

    return [
      fiche.nom,
      fiche.prenom,
      fiche.reference,
      fiche.numeroPiece,
      fiche.client?.email,
      fiche.chambreNumero,
      fiche.nationalite,
    ]
      .filter(Boolean)
      .some((valeur) => String(valeur).toLowerCase().includes(terme));
  });

  return (
    <>
    <InstitutionalHeader />
    <div className="flex min-h-screen flex-col bg-slate-50">
    

      <main className="flex-1 space-y-6 p-4 md:p-8">
        <button
          onClick={() => router.push("/hotel/dashboard")}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Retour au tableau de bord
        </button>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Fiches hôtelières
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Consultez les déclarations, vérifiez les pièces et traitez les
              fiches.
            </p>
          </div>

          <button
            onClick={chargerFiches}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Actualiser
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          >
            {message}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Total affiché",
              value: fiches.length,
              color: "text-slate-900",
            },
            {
              label: "En attente",
              value: fiches.filter((f) => f.statut === "pending").length,
              color: "text-amber-700",
            },
            {
              label: "Validées",
              value: fiches.filter((f) => f.statut === "registered").length,
              color: "text-green-700",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className={`mt-2 text-3xl font-bold ${item.color}`}>
                {item.value}
              </p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b p-4 md:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher un client, une référence..."
                className="w-full rounded-lg border py-2 pl-10 pr-3 text-sm outline-none focus:border-red-500"
              />
            </div>

            <select
              value={statut}
              onChange={(e) => setStatut(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-red-500"
            >
              <option value="all">En attente et validées</option>
              <option value="pending">En attente</option>
              <option value="registered">Validées</option>
              <option value="refused">Refusées</option>
              <option value="transmitted">Transmises à la police</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-slate-500">
              <LoaderCircle className="animate-spin" size={20} />
              Chargement des fiches...
            </div>
          ) : fichesFiltrees.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-center">
              <FileText size={34} className="text-slate-300" />
              <p className="font-medium text-slate-700">Aucune fiche trouvée</p>
              <p className="text-sm text-slate-500">
                Les nouvelles déclarations apparaîtront ici après leur
                soumission.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Pièce d&apos;identité</th>
                    <th className="px-4 py-3">Chambre</th>
                    <th className="px-4 py-3">Séjour</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {fichesFiltrees.map((fiche) => (
                    <tr key={fiche._id} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {[fiche.prenom, fiche.nom]
                            .filter(Boolean)
                            .join(" ") || "Client"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {fiche.nationalite || "—"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {fiche.client?.email ||
                            fiche.email ||
                            "E-mail non disponible"}
                        </p>
                        {fiche.reference && (
                          <p className="mt-0.5 text-xs font-mono text-slate-400">
                            {fiche.reference}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {fiche.typePiece || "CNIB"} n°{" "}
                        {fiche.numeroPiece || "—"}
                      </td>
                      <td className="px-4 py-4">
                        {fiche.chambreNumero || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <p>{formatDate(fiche.dateEntree)}</p>
                        <p className="text-xs text-slate-400">
                          → {formatDate(fiche.dateSortie)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            fiche.statut === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : fiche.statut === "registered"
                              ? "bg-green-100 text-green-800"
                              : fiche.statut === "refused"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {statutLabel(fiche.statut)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Bouton Pièce d'identité */}
                          {fiche.cnibFichier && (
                            <button
                              onClick={() => ouvrirDocument(fiche, "cnib")}
                              className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs hover:bg-slate-100"
                            >
                              <Eye size={14} />
                              Pièce
                            </button>
                          )}

                          {/* Bouton Fiche PDF — toujours à côté de Pièce */}
                          {(fiche.pdfFiche ||
                            fiche.statut === "registered" ||
                            fiche.statut === "transmitted") && (
                            <button
                              onClick={() =>
                                ouvrirDocument(fiche, "fiche-pdf")
                              }
                              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs text-blue-700 hover:bg-blue-100"
                            >
                              <FileText size={14} />
                              Fiche PDF
                            </button>
                          )}

                          {fiche.statut === "pending" && (
                            <>
                              <button
                                disabled={actionId === fiche._id}
                                onClick={() =>
                                  traiterFiche(fiche, "valider")
                                }
                                className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1.5 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                              >
                                <CheckCircle2 size={14} />
                                Valider
                              </button>
                              <button
                                disabled={actionId === fiche._id}
                                onClick={() =>
                                  traiterFiche(fiche, "refuser")
                                }
                                className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1.5 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                <XCircle size={14} />
                                Refuser
                              </button>
                            </>
                          )}

                          {fiche.statut === "registered" && (
                            <button
                              disabled={actionId === fiche._id}
                              onClick={() =>
                                traiterFiche(fiche, "transmettre-police")
                              }
                              className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white hover:bg-slate-700 disabled:opacity-50"
                            >
                              <Send size={14} />
                              Transmettre
                            </button>
                          )}

                          {actionId === fiche._id && (
                            <LoaderCircle
                              size={16}
                              className="animate-spin text-slate-500"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      
    </div>
    <InstitutionalFooter />
    </>
  );
}