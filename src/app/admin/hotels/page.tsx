"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Admin } from "@/lib/api";
import Pagination from "@/components/ui/Pagination";
import { usePagination } from "@/lib/usePagination";
import InstitutionalHeader from "@/components/layout/InstitutionalHeader";
import InstitutionalFooter from "@/components/layout/InstitutionalFooter";

type HotelUser = {
  _id: string;
  nomHotel?: string;
  nom?: string;
  email?: string;
  emailVerified?: boolean;
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

const EMPTY_FORM = {
  nomHotel: "",
  telephone: "",
  rccm: "",
  ville: "",
  email: "",
};

export default function AdminHotelsPage() {
  const [hotels, setHotels] = useState<HotelUser[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  // Formulaire d'ajout
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [tempPassword, setTempPassword] = useState<{
    nom: string;
    email: string;
    password: string;
  } | null>(null);

  const { page, setPage, totalPages, pageItems, total } = usePagination(
    hotels,
    10,
    filter,
  );

  const loadHotels = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const result = await Admin.hotels(filter === "all" ? undefined : filter);

      if (!result.ok) {
        setMessage(
          result.data?.message || "Impossible de charger les établissements.",
        );
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
    if (!window.confirm("Confirmer l'approbation de cet établissement ?"))
      return;

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
      setMessage("Établissement : action effectuée.");
      await loadHotels();
    } else {
      setMessage(result.data?.message || "Action impossible.");
    }

    setBusyId("");
  }

  async function deleteHotel(hotel: HotelUser) {
    const nom = hotel.nomHotel || hotel.nom || "cet établissement";
    if (
      !window.confirm(
        `Supprimer définitivement « ${nom} » ? Cette action est irréversible.`,
      )
    )
      return;

    setBusyId(hotel._id);
    const result = await Admin.deleteUserPermanently(hotel._id);

    if (result.ok) {
      setMessage("Établissement supprimé.");
      await loadHotels();
    } else {
      setMessage(result.data?.message || "Suppression impossible.");
    }

    setBusyId("");
  }

  function openForm() {
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const data = {
      nomHotel: form.nomHotel.trim(),
      telephone: form.telephone.trim(),
      rccm: form.rccm.trim(),
      ville: form.ville.trim(),
      email: form.email.trim(),
    };

    if (
      !data.nomHotel ||
      !data.telephone ||
      !data.rccm ||
      !data.ville ||
      !data.email
    ) {
      setFormError("Nom, téléphone, RCCM, ville et e-mail sont obligatoires.");
      return;
    }

    setSaving(true);
    const result = await Admin.createHotel(data);
    setSaving(false);

    if (!result.ok) {
      const d = result.data as any;
      setFormError(d?.message || "Impossible de créer l'hôtel.");
      return;
    }

    const d = result.data as any;
    setShowForm(false);
    setMessage(d?.message || "Hôtel créé.");
    setTempPassword({
      nom: data.nomHotel,
      email: d?.hotel?.email || data.email,
      password: d?.motDePasseTemporaire,
    });
    await loadHotels();
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

  const inputClass =
    "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-red-500";

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
              Établissements
            </h1>
            <p className="mt-1 text-slate-500">
              Validation et gestion des comptes hôteliers.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={openForm}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
            >
              + Ajouter un hôtel
            </button>
            <Link
              href="/admin/dashboard"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              ← Tableau de bord
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
          <div>
            <p className="font-semibold text-slate-900">
              Liste des établissements
            </p>
            <p className="text-sm text-slate-500">
              {hotels.length} résultat(s) au total
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
                  {pageItems.map((hotel) => (
                    <tr key={hotel._id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <p className="font-semibold text-slate-900">
                          {hotel.nomHotel || hotel.nom || "Hôtel sans nom"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          RCCM : {hotel.rccm || "Non renseigné"}
                        </p>
                        {hotel.emailVerified === false && (
                        <p className="mt-1 text-xs font-semibold text-amber-700">
                          E-mail non vérifié</p>
                          )}
                      </td>
                      <td className="p-4">
                        <p>{hotel.email || "—"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {hotel.telephone || "—"}
                        </p>
                      </td>
                      <td className="p-4">{hotel.villeHotel || "—"}</td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(hotel)}`}
                        >
                          {statusLabel(hotel)}
                        </span>
                      </td>
                      <td className="p-4">
                        {hotel.isActive ? "Actif" : "Désactivé"}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {hotel.hotelStatus === "pending" && (
                            <>
                              <button
                                disabled={!!busyId || hotel.emailVerified === false}
                                onClick={() => approve(hotel._id)}
                                className="rounded-md bg-green-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
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
                            className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
                          >
                            {busyId === hotel._id
                              ? "Traitement..."
                              : hotel.isActive
                                ? "Suspendre"
                                : "Réactiver"}
                          </button>

                          <button
                            disabled={!!busyId}
                            onClick={() => deleteHotel(hotel)}
                            className="rounded-md border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Supprimer
                          </button>
                        </div>
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

      {/* Fenêtre : ajout d'un hôtel */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !saving && setShowForm(false)}
        >
          <form
            onSubmit={submitForm}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6"
          >
            <h2 className="text-lg font-bold text-slate-900">
              Ajouter un hôtel
            </h2>

            {formError && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {formError}
              </p>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium">
                Nom de l&apos;hôtel *
              </label>
              <input
                className={inputClass}
                value={form.nomHotel}
                onChange={(e) => setForm({ ...form, nomHotel: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Téléphone *
                </label>
                <input
                  className={inputClass}
                  value={form.telephone}
                  onChange={(e) =>
                    setForm({ ...form, telephone: e.target.value })
                  }
                  placeholder="+226 70 00 00 00"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Numéro RCCM *
                </label>
                <input
                  className={inputClass}
                  value={form.rccm}
                  onChange={(e) => setForm({ ...form, rccm: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Ville *</label>
              <input
                className={inputClass}
                value={form.ville}
                onChange={(e) => setForm({ ...form, ville: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                E-mail de connexion *
              </label>
              <input
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contact@hotel.com"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowForm(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
              >
                {saving ? "Création..." : "Créer l'hôtel"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Fenêtre : mot de passe temporaire (affiché une seule fois) */}
      {tempPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Hôtel créé : {tempPassword.nom}
            </h2>
            <p className="text-sm text-slate-600">
              Transmettez ces identifiants à l&apos;hôtel : il devra se
              connecter pour ajouter ses chambres. Le mot de passe ne sera plus
              affiché après fermeture de cette fenêtre.
            </p>
            <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
              <p>
                <span className="text-slate-500">E-mail : </span>
                <span className="font-mono">{tempPassword.email}</span>
              </p>
              <p>
                <span className="text-slate-500">Mot de passe : </span>
                <span className="font-mono font-semibold">
                  {tempPassword.password}
                </span>
              </p>
            </div>
            <button
              onClick={() => setTempPassword(null)}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              J&apos;ai noté, fermer
            </button>
          </div>
        </div>
      )}
    </main>
    <InstitutionalFooter/>
    </>
  );
}