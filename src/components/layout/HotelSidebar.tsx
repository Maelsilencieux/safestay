"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, LayoutDashboard, FileText, FolderOpen, BedDouble, LogOut, Landmark, UserRoundCheck  } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/hotel/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
  { href: "/hotel/fiches", icon: FileText, label: "Fiches hôtelières" },
  { href: "/hotel/documents", icon: FolderOpen, label: "Documents" },
  { href: "/hotel/chambres", icon: BedDouble, label: "Chambres" },
  { href: "/hotel/clients", icon: UserRoundCheck, label: "Clients" },
];

export default function HotelSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  return (
    <aside className="fixed inset-y-0 left-0  flex w-64 flex-col border-r border-black/10 bg-white ">
      <div className="burkina-stripe" />
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-burkina-green text-white"><ShieldCheck className="h-5 w-5" /></div>
          <div><p className="text-[9px] font-bold uppercase tracking-widest text-burkina-red">Mali</p><p className="font-bold text-slate-900">SafeStay</p></div>
        </div>
        <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500"><Landmark className="mr-1 inline h-3.5 w-3.5" /> Espace établissement</div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-5">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Navigation</p>
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-lg border-l-4 px-4 py-3 text-sm font-medium transition", active ? "border-burkina-green bg-burkina-green/10 text-burkina-green" : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900")}><item.icon className="h-5 w-5" />{item.label}</Link>;
        })}
      </nav>
      <div className="border-t border-slate-100 p-4"><button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-500 transition hover:bg-red-50 hover:text-burkina-red"><LogOut className="h-5 w-5" />Déconnexion</button></div>
    </aside>
  );
}
