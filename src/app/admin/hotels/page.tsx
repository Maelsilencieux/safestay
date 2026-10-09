
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Admin } from "@/lib/api";

type HotelUser = {
  _id: string;
  nomHotel?: string;
  nom?: string;
  email?: string;
  telephone?: string;
  adresseHotel?: string;
  villeHotel?: string;
  rccm?: string;
  hotelStatus?: string;
  isActive?: boolean;
  createdAt?: string;
};

function getList(result: any, key: string): any[] {
  const data = result?.data;
  return data?.[key] ?? data?.data?.[key] ?? [];
}

export default function AdminHotelsPage() {
  const [hotels, setHotels] = useState<HotelUser[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const loadHotels = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const result = await Admin.hotels(
        filter === "all" ? undefined : filter
      );

      if (!result.ok) {
        setMessage(result.data?.message || "Impossible de charger les établissements.");
        return;
      }

      setHotels(getList(result, "hotels"));
    } catch {
      setMessage("Erreur lors du chargement des établissements.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void loadHotels();
  }, [loadHotels]);

  async function approve(id: string) {
    if (!window.confirm("Confirmer l'approbation de cet établissement ?")) return;

    setBusyId(id);
    const result = await Admin.approuver(id);

    if (result.ok) {
      setMessage("Établissement approuvé.");
      await loadHotels();
    } else {
      setMessage(result.data?.message || "Échec de l'approbation.");
    }

    setBusyId("");
  }

  async function reject(id: string) {
    const motif = window.prompt("Motif du rejet de la demande :");
    if (motif === null) return;

    if (!motif.trim()) {
      setMessage("Le motif du rejet est obligatoire.");
      return;
    }

    setBusyId(id);
    const result = await Admin.rejeter(id, motif.trim());

    if (result.ok) {
      setMessage("Demande rejetée.");
      await loadHotels();
    } else {
      setMessage(result.data?.message || "Échec du rejet.");
    }

    setBusyId("");
  }

  async function toggleHotel(hotel: HotelUser) {
    const action = hotel.isActive ? "suspendre" : "réactiver";

    if (!window.confirm(`Voulez-vous ${action} cet établissement ?`)) return;

    setBusyId(hotel._id);
    const result = await Admin.toggleUser(hotel._id);

    if (result.ok) {
      setMessage(`Établissement : action effectuée.`);
      await loadHotels();
    } else {
      setMessage(result.data?.message || "Action impossible.");
    }

    setBusyId("");
  }

  function statusLabel(hotel: HotelUser) {
    if (hotel.hotelStatus === "approved") return "Approuvé";
    if (hotel.hotelStatus === "rejected") return "Rejeté";
    if (hotel.hotelStatus === "pending") return "En attente";
    return hotel.hotelStatus || "Non renseigné";
  }

  function statusClass(hotel: HotelUser) {
    if (!hotel.isActive) return "bg-gray-100 text-gray-700";
    if (hotel.hotelStatus === "approved") return "bg-green-100 text-green-800";
    if (hotel.hotelStatus === "rejected") return "bg-red-100 text-red-800";
    return "bg-amber-100 text-amber-800";
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-red-700">
              Administration SafeStay
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Établissements
            </h1>
            <p className="mt-1 text-slate-500">
              Validation et gestion des comptes hôteliers.
            </p>
          </div>

          <Link
            href="/admin/dashboard"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            ← Tableau de bord
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
          <div>
            <p className="font-semibold text-slate-900">Liste des établissements</p>
            <p className="text-sm text-slate-500">
              {hotels.length} résultat(s) affiché(s)
            </p>
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuvés</option>
            <option value="rejected">Rejetés</option>
          </select>
        </div>

        {message && (
          <div
            role="status"
            className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700"
          >
            {message}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <p className="p-8 text-center text-slate-500">Chargement...</p>
          ) : hotels.length === 0 ? (
            <p className="p-8 text-center text-slate-500">
              Aucun établissement trouvé.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-4">Établissement</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Ville</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4">Compte</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hotels.map((hotel) => (
                    <tr key={hotel._id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <p className="font-semibold text-slate-900">
                          {hotel.nomHotel || hotel.nom || "Hôtel sans nom"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          RCCM : {hotel.rccm || "Non renseigné"}
                        </p>
                      </td>
                      <td className="p-4">
                        <p>{hotel.email || "—"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {hotel.telephone || "—"}
                        </p>
                      </td>
                      <td className="p-4">{hotel.villeHotel || "—"}</td>
                      <td className="p-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(hotel)}`}>
                          {statusLabel(hotel)}
                        </span>
                      </td>
                      <td className="p-4">
                        {hotel.isActive ? "Actif" : "Désactivé"}
                      </td>
                      <td className="space-y-2 p-4">
                        {hotel.hotelStatus === "pending" && (
                          <>
                            <button
                              disabled={!!busyId}
                              onClick={() => approve(hotel._id)}
                              className="mr-2 rounded-md bg-green-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              Approuver
                            </button>
                            <button
                              disabled={!!busyId}
                              onClick={() => reject(hotel._id)}
                              className="rounded-md bg-red-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              Rejeter
                            </button>
                          </>
                        )}

                        <button
                          disabled={!!busyId}
                          onClick={() => toggleHotel(hotel)}
                          className="block rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
                        >
                          {busyId === hotel._id
                            ? "Traitement..."
                            : hotel.isActive
                              ? "Suspendre"
                              : "Réactiver"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}