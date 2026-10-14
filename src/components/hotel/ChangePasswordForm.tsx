"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, CheckCircle2, Circle } from "lucide-react";

import { Auth, getUser, saveSession } from "@/lib/api";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
};

function PasswordField({ label, value, onChange, autoComplete }: FieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-11 text-sm text-slate-900 outline-none focus:border-[#009e49] focus:ring-2 focus:ring-[#009e49]/20"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          aria-label={visible ? "Masquer" : "Afficher"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const rules = [
    { label: "Au moins 8 caractères", ok: next.length >= 8 },
    { label: "Au moins une lettre", ok: /[A-Za-z]/.test(next) },
    { label: "Au moins un chiffre", ok: /\d/.test(next) },
    { label: "Confirmation identique", ok: next.length > 0 && next === confirm },
  ];
  const valid = rules.every((r) => r.ok) && current.length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || loading) return;

    setLoading(true);
    setMessage(null);

    const res = await Auth.changePassword(current, next, confirm);

    if (res.ok && res.data.success !== false) {
      // Le serveur renvoie un nouveau token : on le garde pour rester connecté
      const token = (res.data as any).token as string | undefined;
      const user = getUser();
      if (token && user) saveSession(token, user);

      setMessage({ type: "ok", text: "Votre mot de passe a été modifié avec succès." });
      setCurrent("");
      setNext("");
      setConfirm("");
    } else {
      setMessage({
        type: "error",
        text: res.data.message || "Une erreur est survenue. Réessayez.",
      });
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-5">
      <PasswordField
        label="Mot de passe actuel"
        value={current}
        onChange={setCurrent}
        autoComplete="current-password"
      />
      <PasswordField
        label="Nouveau mot de passe"
        value={next}
        onChange={setNext}
        autoComplete="new-password"
      />
      <PasswordField
        label="Confirmer le nouveau mot de passe"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
      />

      <ul className="space-y-1.5">
        {rules.map((r) => (
          <li
            key={r.label}
            className={cn(
              "flex items-center gap-2 text-xs",
              r.ok ? "text-green-600" : "text-slate-400"
            )}
          >
            {r.ok ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
            {r.label}
          </li>
        ))}
      </ul>

      {message && (
        <p
          className={cn(
            "rounded-xl px-4 py-3 text-sm",
            message.type === "ok"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          )}
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={!valid || loading}
        className="w-full rounded-xl bg-[#009e49] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#008a40] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Modification en cours..." : "Modifier mon mot de passe"}
      </button>
    </form>
  );
}