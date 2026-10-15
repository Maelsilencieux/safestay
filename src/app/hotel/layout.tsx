"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import HotelSidebar from "@/components/layout/HotelSidebar";
import InstitutionalHeader from "@/components/layout/InstitutionalHeader";
import InstitutionalFooter from "@/components/layout/InstitutionalFooter";

export default function HotelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isHotel, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
  if (loading) return;
  if (!user) router.replace("/login");
  else if (isAdmin) router.replace("/admin/dashboard");
  else if (!isHotel) router.replace("/fiche");
  else if ((user as any).mustChangePassword && pathname !== "/hotel/parametres")
    router.replace("/hotel/parametres");
}, [user, loading, isHotel, isAdmin, pathname, router]);
  if (loading || !user || !isHotel) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#009e49] border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <InstitutionalHeader />
      <div className="flex min-h-screen bg-slate-50">
        <HotelSidebar />
        <main className="ml-64 min-w-0 flex-1">{children}</main>
      </div>
      <InstitutionalFooter />
    </>
  );
}