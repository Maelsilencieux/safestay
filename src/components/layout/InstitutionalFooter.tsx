export default function InstitutionalFooter() {
  return (
    <footer className=" absolute w-full mt-auto border-t border-black/10 bg-slate-950 text-white z-100">
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-burkina-yellow">République du MALI</p>
            <h2 className="mt-2 text-lg font-bold">SafeStay</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-white/60">Plateforme numérique destinée à faciliter la collecte, la validation et la centralisation des fiches d&apos;enregistrement hôtelières.</p>
          </div>
          <div>
            <h3 className="font-semibold">Accès rapide</h3>
            <div className="mt-3 space-y-2 text-sm text-white/60">
              <p>Nouvelle fiche d&apos;enregistrement</p>
              <p>Suivi des fiches</p>
              <p>Espace établissement hôtelier</p>
            </div>
          </div>
          <div>
            <h3 className="font-semibold">Information</h3>
            <p className="mt-3 text-sm leading-6 text-white/60">Les données transmises via la plateforme sont traitées conformément aux règles et procédures applicables aux services publics numériques.</p>
          </div>
        </div>
        <div className="mt-7 border-t border-white/10 pt-5 text-xs text-white/40">© {new Date().getFullYear()} SafeStay - République du MALI. Tous droits réservés.</div>
      </div>
    </footer>
  );
}
