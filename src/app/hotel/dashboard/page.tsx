"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

import InstitutionalHeader from "@/components/layout/InstitutionalHeader";
import InstitutionalFooter from "@/components/layout/InstitutionalFooter";

import { useAuth } from "@/context/AuthContext";
import { Fiches, Hotels } from "@/lib/api";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import HotelSidebar from "@/components/layout/HotelSidebar";


export default function HotelDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    validated: 0,
    refused: 0,
  });
  const [hotelName, setHotelName] = useState("Mon hôtel");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) router.push("/login");
      else if (user.role !== "hotel" && user.role !== "admin")
        router.push("/fiche");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function load() {
      const [statsRes, hotelRes] = await Promise.all([
        Fiches.hotelStats(),
        Hotels.getMonHotel(),
      ]);
      if (statsRes.ok && statsRes.data.success !== false) {
        const d =
          (statsRes.data as any).stats ||
          (statsRes.data as any).data ||
          statsRes.data ||
          {};
        setStats({
          total: d.total || 0,
          pending: d.pending || 0,
          validated: d.validated || d.registered || 0,
          refused: d.refused || 0,
        });
      }
      if (hotelRes.ok && hotelRes.data.success !== false) {
        const h =
          (hotelRes.data as any).hotel ||
          (hotelRes.data as any).data ||
          hotelRes.data;
        if (h?.nomHotel) setHotelName(h.nomHotel);
      }
      setLoading(false);
    }
    if (user) load();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#009e49] border-t-transparent" />
      </div>
    );
  }

  const cards = [
    {
      label: "Total fiches",
      value: stats.total,
      icon: FileText,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "En attente",
      value: stats.pending,
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Validées",
      value: stats.validated,
      icon: CheckCircle2,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Refusées",
      value: stats.refused,
      icon: XCircle,
      color: "bg-red-50 text-red-600",
    },
  ];

  return (
    <>
    <InstitutionalHeader/>
    <div className="flex min-h-screen bg-slate-50">
    
      
    
      <HotelSidebar />

      <main className="ml-64 flex-1 p-8">
        <div className="mb-8 border-b border-slate-200 pb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-burkina-red">Portail établissement</p>
          <h1 className="font-display text-3xl font-bold text-slate-900">
            🏨 {hotelName}
          </h1>
          <p className="mt-1 text-sm text-slate-900/50">
            Espace établissement hôtelier · Bienvenue, {user?.prenom || user?.nomHotel || "Gestionnaire"}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black/40">{c.label}</p>
                  <p className="mt-1 font-display text-3xl font-bold text-slate-900">
                    {c.value}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl",
                    c.color
                  )}
                >
                  <c.icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-xl font-semibold text-slate-900">
            Actions rapides
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => router.push("/hotel/fiches")}>
              Voir les fiches
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/hotel/documents")}
            >
              Documents
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/hotel/chambres")}
            >
              Gérer les chambres
            </Button>
          </div>
        </div>
      </main>
  
    
    </div>
    <InstitutionalFooter/>
    </>

  );
}
