import Link from "next/link";
import { ShieldCheck, FileText, Hotel, ArrowRight, CheckCircle2, Landmark, Users, LockKeyhole } from "lucide-react";
import InstitutionalFooter from "@/components/layout/InstitutionalFooter";
import InstitutionalHeader from "@/components/layout/InstitutionalHeader";
export default function HomePage() {
  
  return (
    <>
   
  <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
    <div className="burkina-stripe" />
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-lg bg-burkina-green text-white"><ShieldCheck className="h-6 w-6" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-burkina-red">République du MALI</p><p className="font-bold">SafeStay</p><p className="text-[10px] text-slate-500">Plateforme numérique des fiches hôtelières</p></div></Link>
        <nav className="flex items-center gap-2"><Link href="/login" className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Connexion</Link><Link href="/register" className="rounded-lg bg-burkina-green px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#007f3b]">Créer un compte</Link></nav>
      </div>
    </header>

    <main className="institutional-grid flex-1">
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-14 lg:px-8 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-burkina-green/20 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-burkina-green shadow-sm"><Landmark className="h-4 w-4" /> Service public numérique</div>
            <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-slate-950 md:text-6xl">Gestion numérique des <span className="text-burkina-green">fiches d&apos;enregistrement hôtelières</span></h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">SafeStay facilite la collecte, la validation et le suivi des informations liées aux séjours hôteliers au MALI, dans un environnement sécurisé et centralisé.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-lg bg-burkina-green px-7 py-3.5 font-bold text-white shadow-lg shadow-emerald-900/10 hover:bg-[#007f3b]">Commencer une démarche <ArrowRight className="h-5 w-5" /></Link><Link href="/login" className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-7 py-3.5 font-semibold text-slate-700 hover:border-burkina-green hover:text-burkina-green">Accéder à mon espace</Link></div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500"><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-burkina-green" /> Démarche numérique</span><span className="inline-flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-burkina-green" /> Données sécurisées</span><span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-burkina-green" /> Usagers et établissements</span></div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5"><div className="flex items-center gap-3 border-b border-slate-100 pb-5"><div className="flex h-12 w-12 items-center justify-center rounded-lg bg-burkina-green/10 text-burkina-green"><FileText className="h-6 w-6" /></div><div><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Parcours usager</p><p className="font-bold text-slate-900">Une procédure en quelques étapes</p></div></div><div className="mt-6 space-y-5">{[["01","Créer ou ouvrir son compte"],["02","Renseigner son identité et son séjour"],["03","Choisir l'établissement et la chambre"],["04","Suivre la validation de la fiche"]].map(([n,t])=><div key={n} className="flex items-center gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-burkina-green">{n}</span><span className="text-sm font-medium text-slate-700">{t}</span></div>)}</div></div>
        </div>
      </section>
      <section className="border-y border-slate-200 bg-white"><div className="mx-auto grid max-w-7xl gap-0 md:grid-cols-3 lg:px-8">{[[FileText,"Dématérialisation","Remplissez et transmettez vos informations depuis un espace unique."],[Hotel,"Établissements","Les hôtels enregistrés peuvent vérifier et traiter les fiches reçues."],[ShieldCheck,"Sécurité","Authentification, contrôle des accès et centralisation des données."]].map(([Icon,title,desc])=><div key={title as string} className="border-slate-200 p-7 md:border-r last:border-r-0"><Icon className="h-7 w-7 text-burkina-green" /><h2 className="mt-4 font-bold text-slate-900">{title as string}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{desc as string}</p></div>)}</div></section>
    </main>
    
  </div>;
  <InstitutionalFooter/>
  </>
  )
}
