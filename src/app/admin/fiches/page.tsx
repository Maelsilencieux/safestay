"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Admin } from "@/lib/api";
import Pagination from "@/components/ui/Pagination";
import InstitutionalHeader from "@/components/layout/InstitutionalHeader";
import InstitutionalFooter from "@/components/layout/InstitutionalFooter";

type HotelFiche = {
  _id: string;
  reference?: string;
  nom?: string;
  prenom?: string;
  client?: {
    nom?: string;
    prenom?: string;
    email?: string;
  };
  hotel?: {
    nomHotel?: string;
    ville?: string;
  };
  chambreNumero?: string;
  dateEntree?: string;
  dateSortie?: string;
  statut?: string;
  createdAt?: string;
};

const PAGE_SIZE = 10;

function extractFiches(result: any): HotelFiche[] {
  const data = result?.data;
  return data?.fiches ?? data?.data?.fiches ?? [];
}

function labelStatus(status?: string) {
  const labels: Record<string, string> = {
    pending: "En attente",
    registered: "Validée",
    refused: "Refusée",
    transmitted: "Transmise à la police",
  };

  return labels[status || ""] || status || "Non renseigné";
}

export default function AdminFichesPage() {
  const [fiches, setFiches] = useState<HotelFiche[]>([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Totaux globaux (indépendants de la page affichée)
  const [globalStats, setGlobalStats] = useState({
    pending: 0,
    transmitted: 0,
  });

  useEffect(() => {
    async function loadStats() {
      const res = await Admin.stats();
      if (res.ok) {
        const s = (res.data as any)?.stats;
        if (s) {
          setGlobalStats({
            pending: s.fichesPending || 0,
            transmitted: s.fichesTransmitted || 0,
          });
        }
      }
    }
    void loadStats();
  }, []);

  const loadFiches = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const params: Record<string, string> = {
      page: String(page),
      limit: String(PAGE_SIZE),
    };
    if (status) params.statut = status;

    const result = await Admin.fiches(params);

    if (result.ok) {
      setFiches(extractFiches(result));
      const d = (result.data as any)?.data ?? (result.data as any);
      setTotalPages(d?.pages || 1);
      setTotal(d?.total || 0);
    } else {
      setMessage(result.data?.message || "Impossible de charger les fiches.");
    }

    setLoading(false);
  }, [status, page]);

  useEffect(() => {
    void loadFiches();
  }, [loadFiches]);

  // La recherche filtre les fiches de la page affichée
  const filtered = fiches.filter((fiche) => {
    const client = fiche.client;
    const haystack = [
      fiche.reference,
      client?.nom || fiche.nom,
      client?.prenom || fiche.prenom,
      client?.email,
      fiche.hotel?.nomHotel,
      fiche.hotel?.ville,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(search.toLowerCase());
  });

  return (
    <>
    <InstitutionalHeader />
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-red-700">
              Administration SafeStay
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Fiches hôtelières
            </h1>
            <p className="mt-1 text-slate-500">
              Suivi centralisé des déclarations de séjour.
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            ← Tableau de bord
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-slate-500">
              {status ? "Fiches (filtre actif)" : "Total des fiches"}
            </p>
            <p className="mt-2 text-3xl font-bold">{total}</p>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-slate-500">En attente</p>
            <p className="mt-2 text-3xl font-bold">{globalStats.pending}</p>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-slate-500">Transmises</p>
            <p className="mt-2 text-3xl font-bold">{globalStats.transmitted}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher dans cette page : client, hôtel, référence..."
            className="min-w-0 flex-1 rounded-lg border px-4 py-2 outline-none focus:border-red-500"
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border px-4 py-2"
          >
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="registered">Validées</option>
            <option value="refused">Refusées</option>
            <option value="transmitted">Transmises à la police</option>
          </select>
        </div>

        {message && (
          <p
            role="status"
            className="rounded-lg border bg-white p-3 text-sm text-slate-700"
          >
            {message}
          </p>
        )}

        <div className="overflow-hidden rounded-xl border bg-white">
          {loading ? (
            <p className="p-8 text-center text-slate-500">Chargement...</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-slate-500">
              Aucune fiche trouvée.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-4">Référence</th>
                    <th className="p-4">Client</th>
                    <th className="p-4">Établissement</th>
                    <th className="p-4">Séjour</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((fiche) => (
                    <tr key={fiche._id} className="hover:bg-slate-50">
                      <td className="p-4 font-semibold">
                        {fiche.reference || fiche._id.slice(-8).toUpperCase()}
                      </td>
                      <td className="p-4">
                        <p>
                          {`${fiche.client?.prenom || fiche.prenom || ""} ${fiche.client?.nom || fiche.nom || ""}`.trim() ||
                            "—"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {fiche.client?.email || ""}
                        </p>
                      </td>
                      <td className="p-4">
                        <p>{fiche.hotel?.nomHotel || "—"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {fiche.hotel?.ville || ""}
                        </p>
                      </td>
                      <td className="p-4">
                        <p>
                          Entrée :{" "}
                          {fiche.dateEntree
                            ? new Date(fiche.dateEntree).toLocaleDateString(
                                "fr-FR",
                              )
                            : "—"}
                        </p>
                        <p className="mt-1">
                          Sortie :{" "}
                          {fiche.dateSortie
                            ? new Date(fiche.dateSortie).toLocaleDateString(
                                "fr-FR",
                              )
                            : "—"}
                        </p>
                      </td>
                      <td className="p-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {labelStatus(fiche.statut)}
                        </span>
                      </td>
                      <td className="p-4">
                        <Link
                          href={`/admin/fiches/${fiche._id}`}
                          className="font-semibold text-red-700 hover:underline"
                        >
                          Consulter
                        </Link>
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
        </div>
      </div>
    </main>
    <InstitutionalFooter/>
    </>
  );
}