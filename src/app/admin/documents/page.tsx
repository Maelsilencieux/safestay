
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Admin, getToken } from "@/lib/api";

type ArchiveDocument = {
  _id: string;
  reference?: string;
  client?: {
    nom?: string;
    prenom?: string;
    email?: string;
  };
  hotel?: {
    nomHotel?: string;
  };
  cnib?: string | null;
  fichePdf?: string | null;
  createdAt?: string;
};

function extractDocuments(result: any): ArchiveDocument[] {
  const data = result?.data;
  return data?.documents ?? data?.data?.documents ?? [];
}

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<ArchiveDocument[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyKey, setBusyKey] = useState("");

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const result = await Admin.documents();

    if (result.ok) {
      setDocuments(extractDocuments(result));
    } else {
      setMessage(result.data?.message || "Impossible de charger les archives.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  async function openDocument(
    id: string,
    kind: "cnib" | "fiche",
    download: boolean
  ) {
    const key = `${id}-${kind}-${download}`;
    setBusyKey(key);
    setMessage("");

    try {
      const token = getToken();
      if (!token) {
        setMessage("Votre session a expiré. Veuillez vous reconnecter.");
        return;
      }

      let url: string;

      if (kind === "cnib") {
        url = download
          ? Admin.documentDownloadUrl(id)
          : Admin.documentViewUrl(id);
      } else {
        url = download
          ? Admin.fichePdfDownloadUrl(id)
          : Admin.fichePdfUrl(id);
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Le document est indisponible ou l'accès a été refusé.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      if (download) {
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `${kind === "cnib" ? "piece-identite" : "fiche-hotel"}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
      }

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'ouvrir le document."
      );
    } finally {
      setBusyKey("");
    }
  }

  const filtered = documents.filter((doc) => {
    const text = [
      doc.reference,
      doc.client?.nom,
      doc.client?.prenom,
      doc.client?.email,
      doc.hotel?.nomHotel,
    ].join(" ").toLowerCase();

    return text.includes(search.toLowerCase());
  });

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-red-700">
              Administration SafeStay
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Archives des documents
            </h1>
            <p className="mt-1 text-slate-500">
              Consultation des pièces d'identité et des fiches PDF conservées.
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
            <p className="text-sm text-slate-500">Fiches archivées ou consultables</p>
            <p className="mt-2 text-3xl font-bold">{documents.length}</p>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-slate-500">Pièces d'identité présentes</p>
            <p className="mt-2 text-3xl font-bold">
              {documents.filter((d) => d.cnib).length}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-slate-500">PDF de fiches présents</p>
            <p className="mt-2 text-3xl font-bold">
              {documents.filter((d) => d.fichePdf).length}
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par client, hôtel ou référence..."
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-red-500"
          />
        </div>

        {message && (
          <p role="status" className="rounded-lg border bg-white p-3 text-sm text-slate-700">
            {message}
          </p>
        )}

        <div className="overflow-hidden rounded-xl border bg-white">
          {loading ? (
            <p className="p-8 text-center text-slate-500">Chargement des archives...</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-slate-500">
              Aucun document trouvé.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-4">Client</th>
                    <th className="p-4">Établissement</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Pièce d'identité</th>
                    <th className="p-4">Fiche PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((doc) => (
                    <tr key={doc._id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <p className="font-semibold">
                          {`${doc.client?.prenom || ""} ${doc.client?.nom || ""}`.trim() || "—"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {doc.client?.email || ""}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Réf. {doc.reference || doc._id.slice(-8)}
                        </p>
                      </td>
                      <td className="p-4">{doc.hotel?.nomHotel || "—"}</td>
                      <td className="p-4">
                        {doc.createdAt
                          ? new Date(doc.createdAt).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                      <td className="p-4">
                        {doc.cnib ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              disabled={!!busyKey}
                              onClick={() => openDocument(doc._id, "cnib", false)}
                              className="rounded-md border px-3 py-2 text-xs font-semibold hover:bg-slate-100 disabled:opacity-50"
                            >
                              Consulter
                            </button>
                            <button
                              disabled={!!busyKey}
                              onClick={() => openDocument(doc._id, "cnib", true)}
                              className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              Télécharger
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Fichier absent</span>
                        )}
                      </td>
                      <td className="p-4">
                        {doc.fichePdf ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              disabled={!!busyKey}
                              onClick={() => openDocument(doc._id, "fiche", false)}
                              className="rounded-md border px-3 py-2 text-xs font-semibold hover:bg-slate-100 disabled:opacity-50"
                            >
                              Consulter
                            </button>
                            <button
                              disabled={!!busyKey}
                              onClick={() => openDocument(doc._id, "fiche", true)}
                              className="rounded-md bg-red-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              Télécharger
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">PDF absent</span>
                        )}
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