"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  BedDouble,
  XCircle,
  Check,
} from "lucide-react";

import InstitutionalHeader from "@/components/layout/InstitutionalHeader";
import InstitutionalFooter from "@/components/layout/InstitutionalFooter";

import { useAuth } from "@/context/AuthContext";
import { Hotels } from "@/lib/api";
import type { Chambre } from "@/types";
import HotelSidebar from "@/components/layout/HotelSidebar";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { cn } from "@/lib/utils";

const TYPES = [
  { value: "Simple", label: "Simple" },
  { value: "Double", label: "Double" },
  { value: "Twin", label: "Twin" },
  { value: "Suite", label: "Suite" },
  { value: "Familiale", label: "Familiale" },
  { value: "Autre", label: "Autre" },
];

const emptyForm = {
  numero: "",
  type: "Simple",
  capacite: 1,
  prix: 0,
  disponible: true,
  description: "",
};

function extractChambres(data: unknown): Chambre[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.chambres)) return d.chambres as Chambre[];
  if (Array.isArray(d.data)) return d.data as Chambre[];
  // hotel object with chambres
  if (d.hotel && typeof d.hotel === "object") {
    const h = d.hotel as Record<string, unknown>;
    if (Array.isArray(h.chambres)) return h.chambres as Chambre[];
  }
  if (Array.isArray(data)) return data as Chambre[];
  return [];
}

export default function HotelChambresPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [chambres, setChambres] = useState<Chambre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Chambre | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) router.push("/login");
      else if (user.role !== "hotel" && user.role !== "admin") router.push("/fiche");
    }
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await Hotels.getMonHotel();
    if (res.ok && res.data.success !== false) {
      setChambres(extractChambres(res.data));
    } else {
      // fallback: try empty
      setChambres([]);
      if (res.data.message) setError(res.data.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function openAdd() {
    setForm(emptyForm);
    setEditing(null);
    setModal("add");
  }

  function openEdit(c: Chambre) {
    setEditing(c);
    setForm({
      numero: c.numero || "",
      type: c.type || "Simple",
      capacite: c.capacite || 1,
      prix: c.prix || 0,
      disponible: c.disponible !== false,
      description: c.description || "",
    });
    setModal("edit");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.numero.trim()) {
      showToast("Le numéro de chambre est obligatoire", "err");
      return;
    }
    setSaving(true);

    const payload = {
      numero: form.numero.trim(),
      type: form.type,
      capacite: Number(form.capacite) || 1,
      prix: Number(form.prix) || 0,
      disponible: form.disponible,
      description: form.description || undefined,
    };

    let res;
    if (modal === "edit" && editing) {
      res = await Hotels.updateChambre(editing._id, payload);
    } else {
      res = await Hotels.addChambre(payload);
    }

    setSaving(false);

    if (res.ok && res.data.success !== false) {
      showToast(modal === "edit" ? "Chambre mise à jour" : "Chambre ajoutée");
      setModal(null);
      load();
    } else {
      showToast(res.data.message || "Erreur lors de l'enregistrement", "err");
    }
  }

  async function handleDelete(c: Chambre) {
    if (!confirm(`Supprimer la chambre ${c.numero} ?`)) return;
    const res = await Hotels.deleteChambre(c._id);
    if (res.ok && res.data.success !== false) {
      showToast("Chambre supprimée");
      load();
    } else {
      showToast(res.data.message || "Erreur lors de la suppression", "err");
    }
  }

  async function toggleDispo(c: Chambre) {
    const res = await Hotels.updateChambre(c._id, {
      disponible: !c.disponible,
    });
    if (res.ok && res.data.success !== false) {
      load();
    } else {
      showToast(res.data.message || "Erreur", "err");
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#009e49] border-t-transparent" />
      </div>
    );
  }

  return (
    <>
    <InstitutionalHeader />
    <div className="flex min-h-screen bg-[#f5f7f5]">
      <HotelSidebar />

      <main className="ml-64 flex-1 p-8">
        {toast && (
          <div
            className={cn(
              "fixed right-6 top-6 z-50 rounded-xl px-5 py-3 text-sm font-medium shadow-lg",
              toast.type === "ok" ? "bg-green-600 text-white" : "bg-red-600 text-white"
            )}
          >
            {toast.msg}
          </div>
        )}

        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-[#172033]">
              Gestion des chambres
            </h1>
            <p className="mt-1 text-sm text-[#172033]/50">
              Ajoutez, modifiez ou désactivez les chambres de votre établissement
            </p>
          </div>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#009e49] border-t-transparent" />
          </div>
        ) : chambres.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 bg-white py-20">
            <BedDouble className="mb-4 h-12 w-12 text-black/20" />
            <p className="text-[#172033]/50">Aucune chambre enregistrée</p>
            <Button className="mt-4" onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Ajouter une chambre
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {chambres.map((c) => (
              <div
                key={c._id}
                className={cn(
                  "rounded-2xl border bg-white p-5 shadow-sm transition",
                  c.disponible
                    ? "border-black/5"
                    : "border-red-100 bg-red-50/30 opacity-80"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-2xl font-bold text-[#172033]">
                        {c.numero}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                          c.disponible
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-600"
                        )}
                      >
                        {c.disponible ? "Libre" : "Occupée"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#172033]/50">
                      {c.type} · {c.capacite} pers.
                      {c.prix ? ` · ${c.prix.toLocaleString("fr-FR")} FCFA` : ""}
                    </p>
                    {c.description && (
                      <p className="mt-2 text-xs text-black/40 line-clamp-2">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <BedDouble className="h-8 w-8 text-[#009e49]/40" />
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-black/5 pt-3">
                  <button
                    onClick={() => toggleDispo(c)}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#172033]/50 transition hover:bg-black/5"
                    title="Changer disponibilité"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {c.disponible ? "Marquer occupée" : "Marquer libre"}
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => openEdit(c)}
                    className="rounded-lg p-1.5 text-black/40 transition hover:bg-black/5 hover:text-[#172033]"
                    title="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-50 hover:text-red-600"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add / Edit Modal */}
        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-black/5 px-6 py-4">
                <h2 className="font-display text-xl font-semibold text-[#172033]">
                  {modal === "add" ? "Nouvelle chambre" : "Modifier la chambre"}
                </h2>
                <button
                  onClick={() => setModal(null)}
                  className="rounded-lg p-1.5 text-black/40 hover:bg-black/5"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4 p-6">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    id="numero"
                    label="N° chambre"
                    required
                    value={form.numero}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, numero: e.target.value }))
                    }
                    placeholder="Ex: 101"
                  />
                  <Select
                    id="type"
                    label="Type"
                    required
                    options={TYPES}
                    value={form.type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, type: e.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    id="capacite"
                    label="Capacité"
                    type="number"
                    min={1}
                    value={String(form.capacite)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        capacite: parseInt(e.target.value) || 1,
                      }))
                    }
                  />
                  <Input
                    id="prix"
                    label="Prix (FCFA)"
                    type="number"
                    min={0}
                    value={String(form.prix)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        prix: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <Input
                  id="description"
                  label="Description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Optionnel"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.disponible}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, disponible: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-black/20 text-[#009e49] focus:ring-[#009e49]"
                  />
                  Chambre disponible
                </label>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setModal(null)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" className="flex-1" loading={saving}>
                    {modal === "add" ? "Ajouter" : "Enregistrer"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
    <InstitutionalFooter/>
    </>

  );
}
