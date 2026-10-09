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

async function apiRequest(path: string) {
  const token = localStorage.getItem("ss_token");

  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
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

export default function HotelClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientValide[]>([]);
  const [recherche, setRecherche] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const chargerClients = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/fiches/hotel?statut=registered");
      const fiches: Fiche[] = Array.isArray(data.fiches) ? data.fiches : [];

      const fichesValidees = fiches.filter(
        (fiche) =>
          fiche.statut === "registered" || fiche.statut === "transmitted"
      );

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
        Array.from(regroupement.values()).sort((a, b) => {
          return (
            new Date(b.derniereFiche || 0).getTime() -
            new Date(a.derniereFiche || 0).getTime()
          );
        })
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger les clients validés."
      );
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    chargerClients();
  }, [chargerClients]);

  async function telechargerDocuments(fiche: Fiche) {
    setDownloadingId(fiche._id);
    setError("");
    setMessage("");

    const token = localStorage.getItem("ss_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    let cnibOk = false;
    let pdfOk = false;
    const manquants: string[] = [];

    try {
      if (fiche.cnibFichier) {
        const r1 = await fetch(`${API_BASE}/fiches/${fiche._id}/cnib`, {
          headers,
        });
        if (r1.ok) {
          const blob = await r1.blob();
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `CNIB_${fiche.nom || ""}_${fiche.prenom || ""}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          cnibOk = true;
        } else {
          manquants.push("pièce d'identité");
        }
      } else {
        manquants.push("pièce d'identité");
      }

      const r2 = await fetch(
        `${API_BASE}/fiches/${fiche._id}/fiche-pdf/download`,
        { headers }
      );
      if (r2.ok) {
        const blob = await r2.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `Fiche_${fiche.reference || fiche._id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        pdfOk = true;
      } else {
        const data = await r2.json().catch(() => ({}));
        manquants.push(data.message || "fiche hôtelière PDF");
      }

      if (cnibOk && pdfOk) {
        setMessage(
          `Documents téléchargés avec succès pour ${fiche.prenom} ${fiche.nom}.`
        );
      } else if (manquants.length) {
        setError(
          `Document(s) manquant(s) : ${manquants.join(
            " et "
          )}. Le téléchargement n'est pas complet.`
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors du téléchargement des documents."
      );
    } finally {
      setDownloadingId(null);
    }
  }

  const clientsFiltres = clients.filter((client) => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return true;

    return [client.nom, client.prenom, client.email, client.nationalite].some(
      (valeur) => valeur.toLowerCase().includes(terme)
    );
  });

  return (
    <>
    <InstitutionalHeader />
    <main className="space-y-6 p-4 md:p-8">
        
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
            Clients validés
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Clients ayant au moins une fiche validée. Téléchargez les deux
            documents (pièce d&apos;identité + fiche PDF).
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
                : clients.reduce(
                    (total, client) => total + client.nombreFiches,
                    0
                  )}
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
              Les clients apparaîtront ici dès que leur fiche sera validée
              par l&apos;hôtel.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Nationalité</th>
                  <th className="px-4 py-3">Fiches</th>
                  <th className="px-4 py-3">Dernière fiche</th>
                  <th className="px-4 py-3">Références</th>
                  <th className="px-4 py-3 text-right">Documents</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {clientsFiltres.map((client) => (
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
                      <div className="flex flex-wrap gap-1">
                        {client.fiches.map((fiche) => (
                          <span
                            key={fiche._id}
                            title={`Séjour : ${formatDate(
                              fiche.dateEntree
                            )} – ${formatDate(fiche.dateSortie)}`}
                            className="rounded border bg-slate-50 px-2 py-1 text-xs text-slate-600"
                          >
                            {fiche.reference || fiche._id.slice(-8)}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {client.fiches.map((fiche) => (
                          <button
                            key={fiche._id}
                            disabled={downloadingId === fiche._id}
                            onClick={() => telechargerDocuments(fiche)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                            title="Télécharger pièce d'identité + fiche PDF"
                          >
                            {downloadingId === fiche._id ? (
                              <LoaderCircle
                                size={14}
                                className="animate-spin"
                              />
                            ) : (
                              <Download size={14} />
                            )}
                            Télécharger
                          </button>
                        ))}
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
    <InstitutionalFooter />
    </>
  );
}