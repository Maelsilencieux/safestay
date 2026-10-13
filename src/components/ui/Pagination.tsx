"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  total?: number;
};

export default function Pagination({ page, totalPages, onChange, total }: Props) {
  if (totalPages <= 1) return null;

  const btn =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-white hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex items-center justify-between border-t p-4">
      <p className="text-sm text-slate-500">
        {total !== undefined ? `${total} résultat(s)` : ""}
      </p>
      <div className="flex items-center gap-3">
        <button
          className={btn}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Page précédente"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium text-slate-700">
          {page} / {totalPages}
        </span>
        <button
          className={btn}
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Page suivante"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}