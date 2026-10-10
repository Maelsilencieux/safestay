"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  IdCard,
  Plane,
  BedDouble,
  CreditCard,
  Check,
  LogOut,
  Upload,
  FileText,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Hotels, Fiches } from "@/lib/api";
import type { Hotel } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Identité", icon: IdCard },
  { id: 2, label: "Voyage", icon: Plane },
  { id: 3, label: "Séjour", icon: BedDouble },
  { id: 4, label: "Paiement", icon: CreditCard },
];

const NATIONALITES = [
  "Burkinabé", "Ivoirien", "Malien", "Nigérien",
  "Sénégalais", "Guinéen", "Togolais", "Béninois",
  "Ghanéen", "Nigérian", "Américain", "Français", "Autre",
].map((n) => ({ value: n, label: n }));

const PIECES = [
  { value: "CNIB", label: "CNIB / Carte d'identité" },
  { value: "Passeport", label: "Passeport" },
  { value: "Permis", label: "Permis de conduire" },
  { value: "Autre", label: "Autre" },
];

const MOTIFS = [
  { value: "Tourisme", label: "Tourisme" },
  { value: "Affaires", label: "Affaires" },
  { value: "Famille", label: "Famille / Visite" },
  { value: "Transit", label: "Transit" },
  { value: "Autre", label: "Autre" },
];

const TRANSPORTS = [
  { value: "Voiture", label: "Voiture particulière" },
  { value: "Taxi", label: "Taxi" },
  { value: "Bus", label: "Bus / Car" },
  { value: "Avion", label: "Avion" },
  { value: "Train", label: "Train" },
  { value: "Autre", label: "Autre" },
];

const PAIEMENTS = [
  { value: "cash", label: "Espèces", icon: "💵" },
  { value: "cheque", label: "Chèque de voyages", icon: "📝" },
  { value: "carte", label: "Carte de crédit", icon: "💳" },
  { value: "voucher", label: "Voucher", icon: "🎫" },
] as const;

// Structure alignée sur le modèle et les validateurs backend (fiches.js)
interface FicheState {
  nom: string;
  prenom: string;
  dateNaissance: string;
  lieuNaissance: string;
  nationalite: string;
  profession: string;
  adresse: string;
  ville: string;
  bp: string;
  typePiece: string;
  numeroPiece: string;
  delivreLe: string;
  delivreA: string;
  venantDe: string;
  allantA: string;
  motif: string;
  hotelId: string;
  dateEntree: string;
  dateSortie: string;
  chambreNumero: string;
  transport: string;
  plaque: string;
  modePaiement: string;
  cnibFile: File | null;
}

const initialForm: FicheState = {
  nom: "",
  prenom: "",
  dateNaissance: "",
  lieuNaissance: "",
  nationalite: "",
  profession: "",
  adresse: "",
  ville: "",
  bp: "",
  typePiece: "CNIB",
  numeroPiece: "",
  delivreLe: "",
  delivreA: "",
  venantDe: "",
  allantA: "",
  motif: "",
  hotelId: "",
  dateEntree: "",
  dateSortie: "",
  chambreNumero: "",
  transport: "",
  plaque: "",
  modePaiement: "cash",
  cnibFile: null,
};

export default function FichePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FicheState>(initialForm);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user) {
      setForm((f) => ({
        ...f,
        nom: user.nom || "",
        prenom: user.prenom || "",
      }));
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    Hotels.getAll().then(setHotels);
  }, []);

  const update = useCallback(
    (key: keyof FicheState, value: string | File | null) => {
      setForm((f) => ({ ...f, [key]: value }));
      setError("");
    },
    []
  );

  function validateStep(s: number): boolean {
    if (s === 1) {
      if (
        !form.nom ||
        !form.prenom ||
        !form.dateNaissance ||
        !form.lieuNaissance ||
        !form.nationalite ||
        !form.adresse ||
        !form.ville ||
        !form.typePiece ||
        !form.numeroPiece ||
        !form.delivreLe ||
        !form.delivreA ||
        !form.cnibFile
      ) {
        setError("Veuillez remplir tous les champs obligatoires de l'identité et joindre votre pièce (CNIB/Passeport).");
        return false;
      }
    }
    if (s === 2) {
      if (!form.venantDe || !form.allantA || !form.motif) {
        setError("Veuillez indiquer votre provenance, destination et le motif du séjour.");
        return false;
      }
    }
    if (s === 3) {
      if (!form.hotelId || !form.dateEntree || !form.dateSortie || !form.chambreNumero || !form.transport) {
        setError("Veuillez compléter toutes les informations de séjour (hôtel, dates, chambre et transport).");
        return false;
      }
      if (new Date(form.dateSortie) <= new Date(form.dateEntree)) {
        setError("La date de sortie doit être postérieure à la date d'entrée.");
        return false;
      }
    }
    return true;
  }

  function next() {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, 4));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function prev() {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit() {
    if (!validateStep(3)) return;
    setSubmitting(true);
    setError("");

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v instanceof File) {
        if (k === "cnibFile") {
          fd.append("cnib", v); // Correspond à upload.single('cnib') côté backend
        } else {
          fd.append(k, v);
        }
      } else if (v != null && v !== "") {
        fd.append(k, String(v));
      }
    });

    const res = await Fiches.submit(fd);
    setSubmitting(false);

    if (res.ok && res.data.success) {
      setSuccess(true);
    } else {
      setError(res.data.message || "Erreur lors de l'envoi de la fiche.");
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#009e49] border-t-transparent" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5f7f5] px-6">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="font-display text-3xl font-bold text-[#172033]">
            Fiche envoyée !
          </h2>
          <p className="mt-3 text-[#172033]/60">
            Votre fiche d&apos;enregistrement a été transmise à l&apos;hôtel.
            Vous serez notifié dès sa validation.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => router.push("/mes-fiches")}>
              Voir mes fiches
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSuccess(false);
                setStep(1);
                setForm({
                  ...initialForm,
                  nom: user?.nom || "",
                  prenom: user?.prenom || "",
                });
              }}
            >
              Nouvelle fiche
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f5]">
      {/* Topbar */}
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-[#009e49]" />
            <span className="font-display text-lg font-semibold text-[#172033]">
              SafeStay
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-[#172033]/60 sm:inline">
              Bonjour, <strong>{user?.prenom || "Visiteur"}</strong>
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[#172033]/50 transition hover:bg-black/5 hover:text-[#172033]"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* Progress */}
        <div className="mb-10 text-center">
          <h1 className="font-display text-3xl font-bold text-[#172033]">
            Fiche d&apos;enregistrement
          </h1>
          <p className="mt-1 text-sm text-[#172033]/50">
            Remplissez votre fiche et envoyez-la à l&apos;hôtel pour validation.
          </p>

          <div className="mt-8 flex items-center justify-center gap-0">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all",
                        done && "border-green-500 bg-green-500 text-white",
                        active && "border-[#009e49] bg-[#009e49] text-white shadow-lg shadow-[#009e49]/30",
                        !done && !active && "border-black/15 bg-white text-black/30"
                      )}
                    >
                      {done ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "mt-1.5 text-xs font-medium",
                        active ? "text-[#009e49]" : "text-black/40"
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "mx-2 mb-5 h-0.5 w-10 sm:w-16",
                        step > s.id ? "bg-green-500" : "bg-black/10"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* ===== STEP 1: Identité ===== */}
        {step === 1 && (
          <Card>
            <CardHeader icon={<IdCard className="h-5 w-5" />}>
              <h3 className="font-display text-lg font-semibold">Identité</h3>
              <p className="text-xs text-black/40">Informations personnelles et pièce d&apos;identité</p>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input id="nom" label="Nom" required value={form.nom} onChange={(e) => update("nom", e.target.value)} placeholder="Votre nom" />
                <Input id="prenom" label="Prénom" required value={form.prenom} onChange={(e) => update("prenom", e.target.value)} placeholder="Votre prénom" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input id="dateNaissance" label="Date de naissance" type="date" required value={form.dateNaissance} onChange={(e) => update("dateNaissance", e.target.value)} />
                <Input id="lieuNaissance" label="Lieu de naissance" required value={form.lieuNaissance} onChange={(e) => update("lieuNaissance", e.target.value)} placeholder="Ville de naissance" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select id="nationalite" label="Nationalité" required placeholder="— Sélectionner —" options={NATIONALITES} value={form.nationalite} onChange={(e) => update("nationalite", e.target.value)} />
                <Input id="profession" label="Profession" value={form.profession} onChange={(e) => update("profession", e.target.value)} placeholder="Votre profession" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Input id="adresse" label="Adresse" required value={form.adresse} onChange={(e) => update("adresse", e.target.value)} placeholder="Votre adresse" />
                <Input id="ville" label="Ville de résidence" required value={form.ville} onChange={(e) => update("ville", e.target.value)} placeholder="Ville" />
                <Input id="bp" label="Boîte Postale (BP)" value={form.bp} onChange={(e) => update("bp", e.target.value)} placeholder="BP (optionnel)" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select id="typePiece" label="Type de pièce" required options={PIECES} value={form.typePiece} onChange={(e) => update("typePiece", e.target.value)} />
                <Input id="numeroPiece" label="N° de la pièce" required value={form.numeroPiece} onChange={(e) => update("numeroPiece", e.target.value)} placeholder="Ex: B1234567" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input id="delivreLe" label="Délivré le" type="date" required value={form.delivreLe} onChange={(e) => update("delivreLe", e.target.value)} />
                <Input id="delivreA" label="Délivré à" required value={form.delivreA} onChange={(e) => update("delivreA", e.target.value)} placeholder="Lieu de délivrance" />
              </div>

              {/* File upload CNIB */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#172033]/80">
                  Scan / Photo de la pièce d&apos;identité (CNIB ou Passeport PDF/Image) <span className="text-red-500">*</span>
                </label>
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-black/10 bg-black/[0.02] px-6 py-8 transition hover:border-[#009e49]/40 hover:bg-[#009e49]/5">
                  <Upload className="h-8 w-8 text-black/25" />
                  <span className="text-sm text-black/40">
                    {form.cnibFile
                      ? form.cnibFile.name
                      : "Glissez votre fichier ici ou cliquez pour parcourir"}
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) =>
                      update("cnibFile", e.target.files?.[0] || null)
                    }
                  />
                </label>
              </div>
            </CardBody>
          </Card>
        )}

        {/* ===== STEP 2: Voyage ===== */}
        {step === 2 && (
          <Card>
            <CardHeader icon={<Plane className="h-5 w-5" />}>
              <h3 className="font-display text-lg font-semibold">Voyage</h3>
              <p className="text-xs text-black/40">Informations sur votre déplacement</p>
            </CardHeader>
            <CardBody className="space-y-4">
              <Input id="venantDe" label="Venant de (Provenance)" required value={form.venantDe} onChange={(e) => update("venantDe", e.target.value)} placeholder="Ville ou pays d'origine" />
              <Input id="allantA" label="Allant à (Destination suivante)" required value={form.allantA} onChange={(e) => update("allantA", e.target.value)} placeholder="Prochaine destination" />
              <Select id="motif" label="Motif du séjour" required placeholder="— Sélectionner —" options={MOTIFS} value={form.motif} onChange={(e) => update("motif", e.target.value)} />
            </CardBody>
          </Card>
        )}

        {/* ===== STEP 3: Séjour ===== */}
        {step === 3 && (
          <Card>
            <CardHeader icon={<BedDouble className="h-5 w-5" />}>
              <h3 className="font-display text-lg font-semibold">Séjour</h3>
              <p className="text-xs text-black/40">Détails de votre hébergement</p>
            </CardHeader>
            <CardBody className="space-y-4">
              <Select
                id="hotelId"
                label="Hôtel"
                required
                placeholder="— Sélectionner un hôtel —"
                options={hotels.map((h) => ({
                  value: h._id,
                  label: h.nomHotel,
                }))}
                value={form.hotelId}
                onChange={(e) => update("hotelId", e.target.value)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input id="dateEntree" label="Date d'entrée" type="date" required value={form.dateEntree} onChange={(e) => update("dateEntree", e.target.value)} />
                <Input id="dateSortie" label="Date de sortie" type="date" required value={form.dateSortie} onChange={(e) => update("dateSortie", e.target.value)} />
              </div>
              <Input id="chambreNumero" label="N° de chambre" required value={form.chambreNumero} onChange={(e) => update("chambreNumero", e.target.value)} placeholder="Ex: 102" />
              <Select id="transport" label="Moyen de transport" required placeholder="— Sélectionner —" options={TRANSPORTS} value={form.transport} onChange={(e) => update("transport", e.target.value)} />
              {form.transport === "Voiture" && (
                <Input id="plaque" label="N° Plaque minéralogique" value={form.plaque} onChange={(e) => update("plaque", e.target.value)} placeholder="Ex: 11 BF 2200 A" />
              )}
            </CardBody>
          </Card>
        )}

        {/* ===== STEP 4: Paiement + Résumé ===== */}
        {step === 4 && (
          <div className="space-y-6">
            <Card>
              <CardHeader icon={<CreditCard className="h-5 w-5" />}>
                <h3 className="font-display text-lg font-semibold">Mode de paiement</h3>
                <p className="text-xs text-black/40">Comment souhaitez-vous régler ?</p>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {PAIEMENTS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => update("modePaiement", p.value)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition",
                        form.modePaiement === p.value
                          ? "border-[#009e49] bg-[#009e49]/10"
                          : "border-black/10 hover:border-black/20"
                      )}
                    >
                      <span className="text-2xl">{p.icon}</span>
                      <span className="text-xs font-medium text-center">
                        {p.label}
                      </span>
                    </button>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Résumé */}
            <Card>
              <CardHeader icon={<FileText className="h-5 w-5" />}>
                <h3 className="font-display text-lg font-semibold">Récapitulatif</h3>
              </CardHeader>
              <CardBody>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  {[
                    ["Nom complet", `${form.prenom} ${form.nom}`],
                    ["Nationalité", form.nationalite],
                    ["Pièce", `${form.typePiece} — ${form.numeroPiece} (Délivré le ${form.delivreLe})`],
                    ["Provenance (Venant de)", form.venantDe],
                    ["Destination (Allant à)", form.allantA],
                    ["Motif", form.motif],
                    [
                      "Hôtel",
                      hotels.find((h) => h._id === form.hotelId)?.nomHotel || "—",
                    ],
                    ["Chambre", form.chambreNumero],
                    ["Entrée", form.dateEntree],
                    ["Sortie", form.dateSortie],
                    ["Transport", form.transport],
                    [
                      "Paiement",
                      PAIEMENTS.find((p) => p.value === form.modePaiement)
                        ?.label || "",
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="flex flex-col">
                      <dt className="text-xs text-black/40">{label}</dt>
                      <dd className="font-medium text-[#172033]">{value || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-8 flex items-center justify-between">
          {step > 1 ? (
            <Button variant="outline" onClick={prev}>
              Précédent
            </Button>
          ) : (
            <div />
          )}
          {step < 4 ? (
            <Button onClick={next}>Suivant</Button>
          ) : (
            <Button onClick={handleSubmit} loading={submitting} size="lg">
              Envoyer ma fiche
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}