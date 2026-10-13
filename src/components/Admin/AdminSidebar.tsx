"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  LayoutDashboard,
  Hotel,
  Users,
  FileText,
  LogOut,
  Landmark,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
  { href: "/admin/hotels", icon: Hotel, label: "Hôtels" },
  { href: "/admin/clients", icon: Users, label: "Utilisateurs" },
  { href: "/admin/fiches", icon: FileText, label: "Fiches hôtelières" },
  { href: "/admin/documents", icon: FileText, label: "Documents et pièces d'identité" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Bouton menu (mobile) */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        className="fixed left-3 top-3 z-30 rounded-lg border bg-white p-2 shadow md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Fond sombre (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-black/10 bg-white transition-transform",
          open ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0"
        )}
      >
        <div className="burkina-stripe" />

        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-burkina-green text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-burkina-red">
                  Burkina Faso
                </p>
                <p className="font-bold text-slate-900">SafeStay</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer le menu"
              className="md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <Landmark className="mr-1 inline h-3.5 w-3.5" />
            Administration de la plateforme
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Pilotage
          </p>
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border-l-4 px-4 py-3 text-sm font-medium transition",
                  active
                    ? "border-burkina-green bg-burkina-green/10 text-burkina-green"
                    : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-500 hover:bg-red-50 hover:text-burkina-red"
          >
            <LogOut className="h-5 w-5" />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}