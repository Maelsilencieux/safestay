
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
  X,
  UserRound,
  CalendarDays,
  Hotel,
  ShieldCheck,
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
  telephone?: string;
  adresse?: string;
  quartier?: string;
  secteur?: string;
  ville?: string;
  dateNaissance?: string;
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
  motifRefus?: string;
  client?: {
    _id?: string;
    nom?: string;
    prenom?: string;
    email?: string;
    telephone?: string;
  };
};

type ActionFiche = "valider" | "refuser" | "transmettre-police";

async function apiRequest(
  path: string,
  method = "GET",
  body?: unknown
) {
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
  if (!value) return "Non renseignée";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Non renseignée";

  return date.toLocaleDateString("fr-FR");
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

function statutStyle(statut: string) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    registered: "bg-green-100 text-green-800",
    refused: "bg-red-100 text-red-800",
    transmitted: "bg-blue-100 text-blue-800",
  };

  return styles[statut] || "bg-slate-100 text-slate-700";
}

function Champ({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 p-3">
      <p className="mb-1 text-xs font-medium text-slate-500">
        {label}
      </p>
      <p className="break-words text-sm font-semibold text-slate-900">
        {value?.trim() || "Non renseigné"}
      </p>
    </div>
  );
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
  const [ficheSelectionnee, setFicheSelectionnee] =
    useState<Fiche | null>(null);

  const chargerFiches = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query =
        statut === "all"
          ? ""
          : `?statut=${encodeURIComponent(statut)}`;

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
    action: ActionFiche
  ) {
    let body: { motif?: string } | undefined;

    if (action === "refuser") {
      const motif = window.prompt(
        "Indique le motif du refus :",
        "Informations non conformes"
      );

      if (motif === null) return;

      if (!motif.trim()) {
        setError("Le motif du refus est obligatoire.");
        return;
      }

      body = { motif: motif.trim() };
    } else {
      const confirmations: Record<string, string> = {
        valider:
          "Confirmer la validation de cette fiche ?",
        "transmettre-police":
          "Confirmer la transmission de cette fiche à la police ?",
      };

      if (!window.confirm(confirmations[action])) return;
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

      setMessage(
        data.message || "Opération effectuée avec succès."
      );

      setFicheSelectionnee(null);

      await chargerFiches();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "L'opération a échoué."
      );
    } finally {
      setActionId(null);
    }
  }

  async function ouvrirDocument(
    fiche: Fiche,
    type: "cnib" | "fiche-pdf"
  ) {
    setError("");

    // Ouvrir immédiatement un onglet pour éviter
    // le blocage des fenêtres par le navigateur.
    const onglet = window.open("about:blank", "_blank");

    if (!onglet) {
      setError(
        "Autorise les fenêtres pop-up pour consulter le document."
      );
      return;
    }

    onglet.document.title = "Chargement du document...";

    try {
      const token = localStorage.getItem("ss_token");

      if (!token) {
        throw new Error(
          "Session expirée. Connecte-toi à nouveau."
        );
      }

      const endpoint =
        type === "cnib"
          ? `${API_BASE}/fiches/${fiche._id}/cnib`
          : `${API_BASE}/fiches/${fiche._id}/fiche-pdf/download`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new Error(
          data.message ||
            `Impossible d'ouvrir le document (HTTP ${response.status}).`
        );
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error("Le document est vide.");
      }

      const url = URL.createObjectURL(blob);

      onglet.location.href = url;

      // Laisser le temps au navigateur d'utiliser le fichier.
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 120000);
    } catch (err) {
      onglet.close();

      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la consultation du document."
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
      fiche.email,
      fiche.chambreNumero,
      fiche.nationalite,
      fiche.telephone,
    ]
      .filter(Boolean)
      .some((valeur) =>
        String(valeur).toLowerCase().includes(terme)
      );
  });

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <InstitutionalHeader />

      <main className="flex-1 space-y-6 p-4 md:p-8">
        <button
          type="button"
          onClick={() => router.push("/hotel/dashboard")}
          className="inline-flex items-center gap-2 text-sm
            font-medium text-slate-600 hover:text-slate-900"
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
              Consultez les formulaires, vérifiez les pièces
              et traitez les déclarations avant validation.
            </p>
          </div>

          <button
            type="button"
            onClick={chargerFiches}
            disabled={loading}
            className="inline-flex items-center justify-center
              gap-2 rounded-lg border bg-white px-4 py-2
              text-sm font-medium hover:bg-slate-50
              disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Actualiser
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg
              border border-red-200 bg-red-50 p-3
              text-sm text-red-700"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="ml-auto"
              aria-label="Fermer le message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {message && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg
              border border-green-200 bg-green-50 p-3
              text-sm text-green-800"
          >
            <CheckCircle2 size={18} />
            <span>{message}</span>
            <button
              type="button"
              onClick={() => setMessage("")}
              className="ml-auto"
              aria-label="Fermer le message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Indicateurs */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total affiché",
              value: fiches.length,
              color: "text-slate-900",
            },
            {
              label: "En attente",
              value: fiches.filter(
                (f) => f.statut === "pending"
              ).length,
              color: "text-amber-700",
            },
            {
              label: "Validées",
              value: fiches.filter(
                (f) => f.statut === "registered"
              ).length,
              color: "text-green-700",
            },
            {
              label: "Refusées",
              value: fiches.filter(
                (f) => f.statut === "refused"
              ).length,
              color: "text-red-700",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">
                {item.label}
              </p>
              <p
                className={`mt-2 text-3xl font-bold ${item.color}`}
              >
                {item.value}
              </p>
            </div>
          ))}
        </section>

        {/* Liste des fiches */}
        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b p-4 md:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2
                  -translate-y-1/2 text-slate-400"
              />

              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher un client, une référence..."
                className="w-full rounded-lg border py-2 pl-10
                  pr-3 text-sm outline-none focus:border-red-500"
              />
            </div>

            <select
              value={statut}
              onChange={(e) => setStatut(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm
                outline-none focus:border-red-500"
              aria-label="Filtrer par statut"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="registered">Validées</option>
              <option value="refused">Refusées</option>
              <option value="transmitted">
                Transmises à la police
              </option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-slate-500">
              <LoaderCircle
                className="animate-spin"
                size={20}
              />
              Chargement des fiches...
            </div>
          ) : fichesFiltrees.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-center">
              <FileText size={34} className="text-slate-300" />
              <p className="font-medium text-slate-700">
                Aucune fiche trouvée
              </p>
              <p className="text-sm text-slate-500">
                Modifie le filtre ou la recherche.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">
                      Pièce d'identité
                    </th>
                    <th className="px-4 py-3">Chambre</th>
                    <th className="px-4 py-3">Séjour</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {fichesFiltrees.map((fiche) => (
                    <tr
                      key={fiche._id}
                      className="align-top hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {[fiche.prenom, fiche.nom]
                            .filter(Boolean)
                            .join(" ") || "Client"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {fiche.nationalite || "Nationalité inconnue"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {fiche.client?.email ||
                            fiche.email ||
                            "E-mail non disponible"}
                        </p>

                        {fiche.reference && (
                          <p className="mt-1 font-mono text-xs text-slate-400">
                            {fiche.reference}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <p>
                          {fiche.typePiece || "CNIB"} n°{" "}
                          {fiche.numeroPiece || "—"}
                        </p>

                        {fiche.cnibFichier ? (
                          <span className="mt-1 inline-flex items-center gap-1 text-xs text-green-700">
                            <ShieldCheck size={13} />
                            Pièce disponible
                          </span>
                        ) : (
                          <span className="mt-1 block text-xs text-red-600">
                            Pièce manquante
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {fiche.chambreNumero || "—"}
                      </td>

                      <td className="px-4 py-4">
                        <p>{formatDate(fiche.dateEntree)}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          → {formatDate(fiche.dateSortie)}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap
                            rounded-full px-2.5 py-1 text-xs
                            font-medium ${statutStyle(fiche.statut)}`}
                        >
                          {statutLabel(fiche.statut)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Consulter le formulaire AVANT validation */}
                          <button
                            type="button"
                            onClick={() =>
                              setFicheSelectionnee(fiche)
                            }
                            className="inline-flex items-center gap-1
                              rounded-md border border-blue-200
                              bg-blue-50 px-2.5 py-1.5 text-xs
                              text-blue-700 hover:bg-blue-100"
                          >
                            <Eye size={14} />
                            Formulaire
                          </button>

                          {/* Pièce d'identité */}
                          <button
                            type="button"
                            disabled={!fiche.cnibFichier}
                            onClick={() =>
                              ouvrirDocument(fiche, "cnib")
                            }
                            className="inline-flex items-center gap-1
                              rounded-md border px-2.5 py-1.5
                              text-xs hover:bg-slate-100
                              disabled:cursor-not-allowed
                              disabled:opacity-40"
                          >
                            <Eye size={14} />
                            Pièce
                          </button>

                          {/* PDF officiel uniquement s'il existe */}
                          {fiche.pdfFiche && (
                            <button
                              type="button"
                              onClick={() =>
                                ouvrirDocument(fiche, "fiche-pdf")
                              }
                              className="inline-flex items-center gap-1
                                rounded-md border px-2.5 py-1.5
                                text-xs hover:bg-slate-100"
                            >
                              <FileText size={14} />
                              Voir PDF
                            </button>
                          )}

                          {/* Actions de décision */}
                          {fiche.statut === "pending" && (
                            <>
                              <button
                                type="button"
                                disabled={
                                  actionId === fiche._id ||
                                  !fiche.cnibFichier
                                }
                                onClick={() =>
                                  traiterFiche(fiche, "valider")
                                }
                                title={
                                  !fiche.cnibFichier
                                    ? "La pièce d'identité est manquante"
                                    : "Valider après vérification"
                                }
                                className="inline-flex items-center gap-1
                                  rounded-md bg-green-600 px-2.5
                                  py-1.5 text-xs text-white
                                  hover:bg-green-700
                                  disabled:cursor-not-allowed
                                  disabled:opacity-50"
                              >
                                <CheckCircle2 size={14} />
                                Valider
                              </button>

                              <button
                                type="button"
                                disabled={actionId === fiche._id}
                                onClick={() =>
                                  traiterFiche(fiche, "refuser")
                                }
                                className="inline-flex items-center gap-1
                                  rounded-md bg-red-600 px-2.5
                                  py-1.5 text-xs text-white
                                  hover:bg-red-700
                                  disabled:opacity-50"
                              >
                                <XCircle size={14} />
                                Refuser
                              </button>
                            </>
                          )}

                          {/* Transmission après validation */}
                          {fiche.statut === "registered" && (
                            <button
                              type="button"
                              disabled={actionId === fiche._id}
                              onClick={() =>
                                traiterFiche(
                                  fiche,
                                  "transmettre-police"
                                )
                              }
                              className="inline-flex items-center gap-1
                                rounded-md bg-slate-900 px-2.5
                                py-1.5 text-xs text-white
                                hover:bg-slate-700
                                disabled:opacity-50"
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

      {/* Fenêtre de consultation du formulaire */}
      {ficheSelectionnee && (
        <div
          className="fixed inset-0 z-50 flex items-center
            justify-center bg-slate-950/60 p-3 sm:p-6"
          onClick={() => setFicheSelectionnee(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-formulaire"
            className="max-h-[92vh] w-full max-w-4xl
              overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête de la fenêtre */}
            <div className="sticky top-0 z-10 flex items-center
              justify-between gap-3 border-b bg-white p-4 sm:p-6">
              <div>
                <div className="flex items-center gap-2">
                  <FileText
                    size={22}
                    className="text-red-600"
                  />
                  <h2
                    id="titre-formulaire"
                    className="text-lg font-bold text-slate-900 sm:text-xl"
                  >
                    Formulaire hôtelier
                  </h2>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Vérification avant décision
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFicheSelectionnee(null)}
                className="rounded-lg border p-2 hover:bg-slate-100"
                aria-label="Fermer le formulaire"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 p-4 sm:p-6">
              {/* Statut */}
              <div className="flex flex-wrap items-center
                justify-between gap-3 rounded-xl border p-4">
                <div>
                  <p className="text-xs text-slate-500">
                    Référence de la fiche
                  </p>
                  <p className="mt-1 font-mono font-semibold text-slate-900">
                    {ficheSelectionnee.reference || "Non attribuée"}
                  </p>
                </div>

                <span
                  className={`inline-flex rounded-full px-3 py-1.5
                    text-xs font-semibold
                    ${statutStyle(ficheSelectionnee.statut)}`}
                >
                  {statutLabel(ficheSelectionnee.statut)}
                </span>
              </div>

              {/* Identification */}
              <section>
                <h3 className="mb-3 flex items-center gap-2
                  border-b pb-3 font-bold text-slate-900">
                  <UserRound size={18} className="text-red-600" />
                  I. Identification du client
                </h3>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Champ
                    label="Nom"
                    value={ficheSelectionnee.nom}
                  />
                  <Champ
                    label="Prénom"
                    value={ficheSelectionnee.prenom}
                  />
                  <Champ
                    label="Nationalité"
                    value={ficheSelectionnee.nationalite}
                  />
                  <Champ
                    label="Date de naissance"
                    value={
                      ficheSelectionnee.dateNaissance
                        ? formatDate(ficheSelectionnee.dateNaissance)
                        : undefined
                    }
                  />
                  <Champ
                    label="Type de pièce"
                    value={ficheSelectionnee.typePiece}
                  />
                  <Champ
                    label="Numéro de pièce"
                    value={ficheSelectionnee.numeroPiece}
                  />
                  <Champ
                    label="Adresse / quartier"
                    value={
                      [
                        ficheSelectionnee.adresse,
                        ficheSelectionnee.quartier,
                      ]
                        .filter(Boolean)
                        .join(", ") || undefined
                    }
                  />
                  <Champ
                    label="Secteur"
                    value={ficheSelectionnee.secteur}
                  />
                  <Champ
                    label="Ville"
                    value={ficheSelectionnee.ville}
                  />
                  <Champ
                    label="E-mail"
                    value={
                      ficheSelectionnee.client?.email ||
                      ficheSelectionnee.email
                    }
                  />
                  <Champ
                    label="Téléphone"
                    value={
                      ficheSelectionnee.telephone ||
                      ficheSelectionnee.client?.telephone
                    }
                  />
                </div>
              </section>

              {/* Séjour */}
              <section>
                <h3 className="mb-3 flex items-center gap-2
                  border-b pb-3 font-bold text-slate-900">
                  <CalendarDays
                    size={18}
                    className="text-red-600"
                  />
                  II. Informations sur le séjour
                </h3>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Champ
                    label="Numéro de chambre"
                    value={ficheSelectionnee.chambreNumero}
                  />
                  <Champ
                    label="Date d'arrivée"
                    value={
                      ficheSelectionnee.dateEntree
                        ? formatDate(ficheSelectionnee.dateEntree)
                        : undefined
                    }
                  />
                  <Champ
                    label="Date de départ"
                    value={
                      ficheSelectionnee.dateSortie
                        ? formatDate(ficheSelectionnee.dateSortie)
                        : undefined
                    }
                  />
                  <Champ
                    label="Date de soumission"
                    value={
                      ficheSelectionnee.createdAt
                        ? formatDate(ficheSelectionnee.createdAt)
                        : undefined
                    }
                  />
                </div>
              </section>

              {/* Documents */}
              <section>
                <h3 className="mb-3 flex items-center gap-2
                  border-b pb-3 font-bold text-slate-900">
                  <Hotel size={18} className="text-red-600" />
                  III. Documents justificatifs
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col justify-between
                    gap-3 rounded-xl border p-4">
                    <div>
                      <p className="font-semibold text-slate-900">
                        Pièce d'identité
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {ficheSelectionnee.cnibFichier
                          ? "Document disponible"
                          : "Aucun fichier enregistré"}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={!ficheSelectionnee.cnibFichier}
                      onClick={() =>
                        ouvrirDocument(ficheSelectionnee, "cnib")
                      }
                      className="inline-flex items-center
                        justify-center gap-2 rounded-lg border
                        px-4 py-2 text-sm font-medium
                        hover:bg-slate-50 disabled:opacity-40"
                    >
                      <Eye size={16} />
                      Consulter la pièce
                    </button>
                  </div>

                  <div className="flex flex-col justify-between
                    gap-3 rounded-xl border p-4">
                    <div>
                      <p className="font-semibold text-slate-900">
                        Fiche hôtelière PDF
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {ficheSelectionnee.pdfFiche
                          ? "PDF officiel disponible"
                          : "Le PDF officiel n'est pas encore disponible"}
                      </p>
                    </div>

                    {ficheSelectionnee.pdfFiche ? (
                      <button
                        type="button"
                        onClick={() =>
                          ouvrirDocument(
                            ficheSelectionnee,
                            "fiche-pdf"
                          )
                        }
                        className="inline-flex items-center
                          justify-center gap-2 rounded-lg border
                          px-4 py-2 text-sm font-medium
                          hover:bg-slate-50"
                      >
                        <FileText size={16} />
                        Consulter le PDF
                      </button>
                    ) : (
                      <p className="rounded-lg bg-slate-50 p-3
                        text-xs text-slate-500">
                        La prévisualisation ci-dessus permet de
                        vérifier les données avant validation.
                        Elle ne remplace pas le PDF officiel.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Motif de refus */}
              {ficheSelectionnee.statut === "refused" &&
                ficheSelectionnee.motifRefus && (
                  <section className="rounded-xl border
                    border-red-200 bg-red-50 p-4">
                    <h3 className="font-semibold text-red-800">
                      Motif du refus
                    </h3>
                    <p className="mt-2 text-sm text-red-700">
                      {ficheSelectionnee.motifRefus}
                    </p>
                  </section>
                )}

              {/* Avertissement avant décision */}
              {ficheSelectionnee.statut === "pending" && (
                <div className="rounded-xl border border-amber-200
                  bg-amber-50 p-4 text-sm text-amber-900">
                  Vérifie l'identité du client, les dates de séjour,
                  la chambre et les documents justificatifs avant
                  de prendre une décision.
                </div>
              )}
            </div>

            {/* Actions dans la fenêtre */}
            <div className="sticky bottom-0 flex flex-wrap
              justify-between gap-3 border-t bg-white p-4 sm:p-5">
              <button
                type="button"
                onClick={() => setFicheSelectionnee(null)}
                className="rounded-lg border px-4 py-2.5
                  text-sm font-medium hover:bg-slate-50"
              >
                Fermer
              </button>

              {ficheSelectionnee.statut === "pending" && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={actionId === ficheSelectionnee._id}
                    onClick={() =>
                      traiterFiche(ficheSelectionnee, "refuser")
                    }
                    className="inline-flex items-center gap-2
                      rounded-lg bg-red-600 px-4 py-2.5
                      text-sm font-semibold text-white
                      hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionId === ficheSelectionnee._id ? (
                      <LoaderCircle
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <XCircle size={16} />
                    )}
                    Refuser
                  </button>

                  <button
                    type="button"
                    disabled={
                      actionId === ficheSelectionnee._id ||
                      !ficheSelectionnee.cnibFichier
                    }
                    title={
                      !ficheSelectionnee.cnibFichier
                        ? "La pièce d'identité est manquante"
                        : "Valider après vérification"
                    }
                    onClick={() =>
                      traiterFiche(ficheSelectionnee, "valider")
                    }
                    className="inline-flex items-center gap-2
                      rounded-lg bg-green-600 px-4 py-2.5
                      text-sm font-semibold text-white
                      hover:bg-green-700 disabled:cursor-not-allowed
                      disabled:opacity-50"
                  >
                    {actionId === ficheSelectionnee._id ? (
                      <LoaderCircle
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    Valider la fiche
                  </button>
                </div>
              )}

              {ficheSelectionnee.statut === "registered" && (
                <button
                  type="button"
                  disabled={actionId === ficheSelectionnee._id}
                  onClick={() =>
                    traiterFiche(
                      ficheSelectionnee,
                      "transmettre-police"
                    )
                  }
                  className="inline-flex items-center gap-2
                    rounded-lg bg-slate-900 px-4 py-2.5
                    text-sm font-semibold text-white
                    hover:bg-slate-700 disabled:opacity-50"
                >
                  <Send size={16} />
                  Transmettre à la police
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <InstitutionalFooter />
    </div>
  );
}