"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Search,
  Users,
  UserRound,
  FileText,
  LoaderCircle,
  AlertCircle,
  Download,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import { usePagination } from "@/lib/usePagination";
import ConfirmModal from "@/components/ui/Validmodal"; // Remplacez par le nom/chemin correct de votre modale

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
  nationalite?: string;
  chambreNumero?: string;
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

type ClientValide = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  nationalite: string;
  nombreFiches: number;
  derniereFiche: string;
  fiches: Fiche[];
};

async function apiRequest(
  path: string,
  options: { method?: string; body?: unknown } = {},
) {
  const token = localStorage.getItem("ss_token");

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Erreur HTTP ${response.status}`);
  }

  return data;
}

function declencherTelechargement(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Récupère toutes les pages d'un statut (le backend limite chaque page)
async function chargerToutes(statut: string): Promise<Fiche[]> {
  const resultat: Fiche[] = [];
  let page = 1;
  let pages = 1;

  do {
    const data = await apiRequest(
      `/fiches/hotel?statut=${statut}&page=${page}&limit=100`,
    );
    if (Array.isArray(data.fiches)) resultat.push(...data.fiches);
    pages = data.pages || 1;
    page += 1;
  } while (page <= pages);

  return resultat;
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR");
}

export default function HotelClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientValide[]>([]);
  const [recherche, setRecherche] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
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

  const chargerClients = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [validees, transmises] = await Promise.all([
        chargerToutes("registered"),
        chargerToutes("transmitted"),
      ]);
      const fichesValidees = [...validees, ...transmises];

      const regroupement = new Map<string, ClientValide>();

      for (const fiche of fichesValidees) {
        const clientId =
          fiche.client?._id ||
          fiche.client?.email ||
          fiche.email ||
          `${fiche.prenom || ""}-${fiche.nom || ""}-${fiche.numeroPiece || fiche._id}`;

        const existant = regroupement.get(clientId);

        if (existant) {
          existant.nombreFiches += 1;
          existant.fiches.push(fiche);

          if (
            fiche.createdAt &&
            (!existant.derniereFiche ||
              new Date(fiche.createdAt) > new Date(existant.derniereFiche))
          ) {
            existant.derniereFiche = fiche.createdAt;
          }
        } else {
          regroupement.set(clientId, {
            id: clientId,
            nom: fiche.nom || fiche.client?.nom || "",
            prenom: fiche.prenom || fiche.client?.prenom || "",
            email: fiche.client?.email || fiche.email || "",
            nationalite: fiche.nationalite || "—",
            nombreFiches: 1,
            derniereFiche: fiche.createdAt || "",
            fiches: [fiche],
          });
        }
      }

      setClients(
        Array.from(regroupement.values()).sort(
          (a, b) =>
            new Date(b.derniereFiche || 0).getTime() -
            new Date(a.derniereFiche || 0).getTime(),
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger les clients validés.",
      );
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    chargerClients();
  }, [chargerClients]);

  async function telechargerFichier(
    fiche: Fiche,
    type: "cnib" | "formulaire",
  ) {
    setDownloadingId(`${fiche._id}-${type}`);
    setError("");
    setMessage("");

    const token = localStorage.getItem("ss_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      if (type === "cnib") {
        if (!fiche.cnibFichier) {
          throw new Error("Aucune pièce d'identité pour cette fiche.");
        }
        const r = await fetch(`${API_BASE}/fiches/${fiche._id}/cnib`, {
          headers,
        });
        if (!r.ok) throw new Error("Pièce d'identité introuvable.");
        declencherTelechargement(
          await r.blob(),
          `CNIB_${fiche.nom || ""}_${fiche.prenom || ""}.pdf`,
        );
        setMessage("Pièce d'identité téléchargée.");
      } else {
        const r = await fetch(
          `${API_BASE}/fiches/${fiche._id}/fiche-pdf/download`,
          { headers },
        );
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.message || "Formulaire PDF introuvable.");
        }
        declencherTelechargement(
          await r.blob(),
          `Fiche_${fiche.reference || fiche._id}.pdf`,
        );
        setMessage("Formulaire téléchargé.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur de téléchargement.",
      );
    } finally {
      setDownloadingId(null);
    }
  }

  // Remplacement du window.confirm par le composant ConfirmModal
  function demanderSuppressionClient(client: ClientValide) {
    const nom =
      [client.prenom, client.nom].filter(Boolean).join(" ") || "ce client";

    setModalConfig({
      isOpen: true,
      title: "Suppression définitive",
      message:
        `Supprimer définitivement ${nom} ?\n\n` +
        `${client.fiches.length} fiche(s) et tous les documents associés ` +
        `(pièces d'identité + formulaires PDF) seront effacés. Cette action est irréversible.`,
      confirmText: "Supprimer",
      type: "danger",
      onConfirm: async () => {
        setDeletingId(client.id);
        setError("");
        setMessage("");

        try {
          await apiRequest("/fiches/hotel/supprimer", {
            method: "POST",
            body: { ficheIds: client.fiches.map((f) => f._id) },
          });
          setMessage(`${nom} et ses documents ont été supprimés.`);
          await chargerClients();
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Suppression impossible.",
          );
        } finally {
          setDeletingId(null);
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  }

  const clientsFiltres = clients.filter((client) => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return true;

    return [client.nom, client.prenom, client.email, client.nationalite].some(
      (valeur) => valeur.toLowerCase().includes(terme),
    );
  });

  const { page, setPage, totalPages, pageItems, total } = usePagination(
    clientsFiltres,
    10,
    recherche,
  );

  return (
    <div className="space-y-6 p-4 md:p-8">
      <button
        onClick={() => router.push("/hotel/dashboard")}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft size={16} />
        Retour au tableau de bord
      </button>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients validés</h1>
          <p className="mt-1 text-sm text-slate-500">
            Clients ayant au moins une fiche validée. Téléchargez la pièce
            d&apos;identité et le formulaire, ou supprimez le client avec tous
            ses documents.
          </p>
        </div>

        <button
          onClick={chargerClients}
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

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-xl border bg-white p-5 shadow-sm">
          <div className="rounded-lg bg-red-50 p-3 text-red-700">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Clients validés</p>
            <p className="text-3xl font-bold text-slate-900">
              {loading ? "—" : clients.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border bg-white p-5 shadow-sm">
          <div className="rounded-lg bg-green-50 p-3 text-green-700">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Fiches validées</p>
            <p className="text-3xl font-bold text-slate-900">
              {loading
                ? "—"
                : clients.reduce((t, client) => t + client.nombreFiches, 0)}
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b p-4">
          <div className="relative max-w-lg">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un client..."
              className="w-full rounded-lg border py-2 pl-10 pr-3 text-sm outline-none focus:border-red-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-slate-500">
            <LoaderCircle size={20} className="animate-spin" />
            Chargement des clients...
          </div>
        ) : clientsFiltres.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <UserRound size={34} className="text-slate-300" />
            <p className="font-medium text-slate-700">
              Aucun client validé trouvé
            </p>
            <p className="text-sm text-slate-500">
              Les clients apparaîtront ici dès que leur fiche sera validée par
              l&apos;hôtel.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Nationalité</th>
                  <th className="px-4 py-3">Fiches</th>
                  <th className="px-4 py-3">Dernière fiche</th>
                  <th className="px-4 py-3 text-right">Documents</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {pageItems.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">
                        {[client.prenom, client.nom]
                          .filter(Boolean)
                          .join(" ") || "Client"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {client.email || "E-mail non disponible"}
                      </p>
                    </td>

                    <td className="px-4 py-4">{client.nationalite}</td>

                    <td className="px-4 py-4">
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
                        {client.nombreFiches}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      {formatDate(client.derniereFiche)}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-col items-end gap-2">
                        {client.fiches.map((fiche) => (
                          <div
                            key={fiche._id}
                            className="flex flex-wrap items-center justify-end gap-2"
                          >
                            <span
                              className="rounded border bg-slate-50 px-2 py-1 text-xs text-slate-600"
                              title={`Séjour : ${formatDate(fiche.dateEntree)} – ${formatDate(fiche.dateSortie)}`}
                            >
                              {fiche.reference || fiche._id.slice(-8)}
                            </span>

                            {/* Pièce d'identité : bleu */}
                            <button
                              disabled={
                                !fiche.cnibFichier ||
                                downloadingId === `${fiche._id}-cnib`
                              }
                              onClick={() => telechargerFichier(fiche, "cnib")}
                              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                              title="Télécharger la pièce d'identité"
                            >
                              {downloadingId === `${fiche._id}-cnib` ? (
                                <LoaderCircle
                                  size={14}
                                  className="animate-spin"
                                />
                              ) : (
                                <Download size={14} />
                              )}
                              Pièce d&apos;identité
                            </button>

                            {/* Formulaire : vert */}
                            <button
                              disabled={
                                downloadingId === `${fiche._id}-formulaire`
                              }
                              onClick={() =>
                                telechargerFichier(fiche, "formulaire")
                              }
                              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                              title="Télécharger le formulaire (fiche hôtelière PDF)"
                            >
                              {downloadingId === `${fiche._id}-formulaire` ? (
                                <LoaderCircle
                                  size={14}
                                  className="animate-spin"
                                />
                              ) : (
                                <FileText size={14} />
                              )}
                              Formulaire
                            </button>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <button
                        disabled={deletingId === client.id}
                        onClick={() => demanderSuppressionClient(client)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        title="Supprimer le client et tous ses documents"
                      >
                        {deletingId === client.id ? (
                          <LoaderCircle size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={setPage}
          total={total}
        />
      </section>

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