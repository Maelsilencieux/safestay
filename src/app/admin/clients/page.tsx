
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Admin } from "@/lib/api";

type AppUser = {
  _id: string;
  nom?: string;
  prenom?: string;
  nomHotel?: string;
  email?: string;
  telephone?: string;
  role?: string;
  isActive?: boolean;
  createdAt?: string;
};

function extractUsers(result: any): AppUser[] {
  const data = result?.data;
  return data?.users ?? data?.data?.users ?? [];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [role, setRole] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const result = await Admin.users(role === "all" ? undefined : role);

    if (result.ok) {
      setUsers(extractUsers(result));
    } else {
      setMessage(result.data?.message || "Impossible de charger les utilisateurs.");
    }

    setLoading(false);
  }, [role]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function toggle(user: AppUser) {
    const action = user.isActive ? "désactiver" : "réactiver";

    if (!window.confirm(`Voulez-vous ${action} ce compte ?`)) return;

    setBusyId(user._id);
    const result = await Admin.toggleUser(user._id);

    if (result.ok) {
      setMessage("État du compte mis à jour.");
      await loadUsers();
    } else {
      setMessage(result.data?.message || "Impossible de modifier ce compte.");
    }

    setBusyId("");
  }

  const filtered = users.filter((user) => {
    const fullName = `${user.prenom || ""} ${user.nom || ""} ${user.nomHotel || ""}`.toLowerCase();
    const query = search.toLowerCase();

    return fullName.includes(query) || (user.email || "").toLowerCase().includes(query);
  });

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-red-700">
              Administration SafeStay
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Utilisateurs</h1>
            <p className="mt-1 text-slate-500">
              Gestion des comptes clients et hôteliers.
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
            <p className="text-sm text-slate-500">Utilisateurs affichés</p>
            <p className="mt-2 text-3xl font-bold">{filtered.length}</p>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-slate-500">Comptes actifs chargés</p>
            <p className="mt-2 text-3xl font-bold">
              {users.filter((u) => u.isActive).length}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-slate-500">Comptes désactivés chargés</p>
            <p className="mt-2 text-3xl font-bold">
              {users.filter((u) => !u.isActive).length}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email..."
            className="min-w-0 flex-1 rounded-lg border px-4 py-2 outline-none focus:border-red-500"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-lg border px-4 py-2"
          >
            <option value="all">Tous les rôles</option>
            <option value="client">Clients</option>
            <option value="hotel">Hôtels</option>
          </select>
        </div>

        {message && (
          <p role="status" className="rounded-lg border bg-white p-3 text-sm text-slate-700">
            {message}
          </p>
        )}

        <div className="overflow-hidden rounded-xl border bg-white">
          {loading ? (
            <p className="p-8 text-center text-slate-500">Chargement...</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-slate-500">Aucun utilisateur trouvé.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-4">Nom / établissement</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Rôle</th>
                    <th className="p-4">État</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((user) => (
                    <tr key={user._id} className="hover:bg-slate-50">
                      <td className="p-4 font-medium">
                        {user.nomHotel || `${user.prenom || ""} ${user.nom || ""}`.trim() || "—"}
                      </td>
                      <td className="p-4">{user.email || "—"}</td>
                      <td className="p-4">
                        {user.role === "hotel" ? "Établissement" : user.role === "client" ? "Client" : user.role}
                      </td>
                      <td className="p-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          user.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-slate-200 text-slate-700"
                        }`}>
                          {user.isActive ? "Actif" : "Désactivé"}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          disabled={!!busyId}
                          onClick={() => toggle(user)}
                          className="rounded-md border px-3 py-2 text-xs font-semibold hover:bg-slate-100 disabled:opacity-50"
                        >
                          {busyId === user._id
                            ? "Traitement..."
                            : user.isActive
                              ? "Désactiver"
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