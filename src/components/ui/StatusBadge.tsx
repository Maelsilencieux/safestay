import { cn } from "@/lib/utils";
import type { FicheStatut } from "@/types";

const MAP: Record<
  FicheStatut | string,
  { label: string; className: string }
> = {
  pending: {
    label: "En attente",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  registered: {
    label: "Validée",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  validated: {
    label: "Validée",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  refused: {
    label: "Refusée",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  transmitted: {
    label: "Transmise police",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
};

export default function StatusBadge({
  statut,
  className,
}: {
  statut: string;
  className?: string;
}) {
  const cfg = MAP[statut] || {
    label: statut,
    className: "bg-gray-50 text-gray-600 border-gray-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        cfg.className,
        className
      )}
    >
      {cfg.label}
    </span>
  );
}
