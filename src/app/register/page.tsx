"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, User, Hotel } from "lucide-react";
import { Auth } from "@/lib/api";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { cn } from "@/lib/utils";

type AccountType = "client" | "hotel";

export default function RegisterPage() {
  const router = useRouter();
  const [type, setType] = useState<AccountType>("client");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Client fields
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Hotel fields
  const [nomHotel, setNomHotel] = useState("");
  const [adresse, setAdresse] = useState("");
  const [ville, setVille] = useState("");
  const [rccm, setRccm] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

     if (type === "hotel") {
    if (!nomHotel.trim()) {
      setError("Le nom de l'hôtel est obligatoire.");
      return;
    }

    if (!adresse.trim()) {
      setError("L'adresse de l'hôtel est obligatoire.");
      return;
    }

    if (!ville.trim()) {
      setError("La ville de l'hôtel est obligatoire.");
      return;
    }

    if (!rccm.trim()) {
      setError("Le numéro RCCM est obligatoire.");
      return;
    }
  }


    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    setLoading(true);

    let res;
    if (type === "client") {
      res = await Auth.registerClient({
        nom,
        prenom,
        email,
        password,
        telephone,
      });
    } else {
      res = await Auth.registerHotel({
        nomHotel,
        email,
        password,
        adresseHotel: adresse,
        villeHotel: ville,
        telephone,
        rccm,
      });
    }

    setLoading(false);

    if (res.ok && res.data.success) {
  setSuccess(true);
  setTimeout(() => router.push("/login"), 2000);
} else {
  const errors = (res.data as any).errors;

  if (Array.isArray(errors) && errors.length > 0) {
    setError(errors.map((err: any) => err.msg).join(" "));
  } else {
    setError(
      res.data.message || "Erreur lors de l'inscription."
    );
  }
}
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7f5]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Shield className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="font-display text-2xl font-bold text-[#172033]">
            Compte créé avec succès !
          </h2>
          <p className="mt-2 text-sm text-[#172033]/50">
            Redirection vers la connexion...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f5] py-12 px-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex items-center justify-center gap-2">
          <Shield className="h-7 w-7 text-[#009e49]" />
          <span className="font-display text-xl font-semibold text-[#172033]">
            SafeStay
          </span>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-8 shadow-sm">
          <h2 className="font-display text-center text-2xl font-bold text-[#172033]">
            Créer un compte
          </h2>

          {/* Type selector */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType("client")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition",
                type === "client"
                  ? "border-[#009e49] bg-[#009e49]/5"
                  : "border-black/10 hover:border-black/20"
              )}
            >
              <User
                className={cn(
                  "h-6 w-6",
                  type === "client" ? "text-[#009e49]" : "text-black/40"
                )}
              />
              <span className="text-sm font-medium">Client</span>
            </button>
            <button
              type="button"
              onClick={() => setType("hotel")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition",
                type === "hotel"
                  ? "border-[#009e49] bg-[#009e49]/5"
                  : "border-black/10 hover:border-black/20"
              )}
            >
              <Hotel
                className={cn(
                  "h-6 w-6",
                  type === "hotel" ? "text-[#009e49]" : "text-black/40"
                )}
              />
              <span className="text-sm font-medium">Hôtel</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {type === "client" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    id="nom"
                    label="Nom"
                    required
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                  />
                  <Input
                    id="prenom"
                    label="Prénom"
                    required
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <Input
                  id="nomHotel"
                  label="Nom de l'hôtel"
                  required
                  value={nomHotel}
                  onChange={(e) => setNomHotel(e.target.value)}
                />
                <Input
                  id="adresse"
                  label="Adresse"
                  required
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    id="ville"
                    label="Ville"
                    required
                    value={ville}
                    onChange={(e) => setVille(e.target.value)}
                  />
                  <Input
                    id="rccm"
                    label="RCCM"
                    required
                    value={rccm}
                    onChange={(e) => setRccm(e.target.value)}
                  />
                </div>
              </>
            )}

            <Input
              id="email"
              label="E-mail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              id="telephone"
              label="Téléphone"
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
            />
            <Input
              id="password"
              label="Mot de passe"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              id="confirm"
              label="Confirmer le mot de passe"
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              S&apos;inscrire
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[#172033]/50">
            Déjà un compte ?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#009e49] hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
