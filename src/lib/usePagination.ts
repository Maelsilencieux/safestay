import { useEffect, useMemo, useState } from "react";

export function usePagination<T>(items: T[], pageSize = 10, resetKey = "") {
  const [page, setPage] = useState(1);

  // Retour à la page 1 quand la recherche ou le filtre change
  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );

  return { page: safePage, setPage, totalPages, pageItems, total: items.length };
}