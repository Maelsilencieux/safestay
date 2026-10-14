const cron  = require('node-cron');
const Fiche = require('../models/Fiche');
const { libererChambre } = require('../utils/chambres');

const STATUTS_ACTIFS = ['pending', 'registered', 'transmitted'];

async function libererChambresExpirees() {
    const heure  = parseInt(process.env.CHECKOUT_HOUR || '12', 10);
    // dateSortie (minuit) + heure <= maintenant  <=>  dateSortie <= maintenant - heure
    const limite = new Date(Date.now() - heure * 3600 * 1000);

    const fiches = await Fiche.find({
        chambreLiberee: { $ne: true },
        statut: { $in: STATUTS_ACTIFS },
        dateSortie: { $lte: limite },
    }).select('hotel chambreNumero').limit(500);

    let liberees = 0;
    for (const f of fiches) {
        // Ne pas libérer si un autre séjour est encore en cours pour la même chambre
        const autre = await Fiche.exists({
            _id: { $ne: f._id },
            hotel: f.hotel,
            chambreNumero: f.chambreNumero,
            statut: { $in: STATUTS_ACTIFS },
            chambreLiberee: { $ne: true },
            dateSortie: { $gt: limite },
        });
        if (!autre) {
            await libererChambre(f.hotel, f.chambreNumero);
            liberees += 1;
        }
        await Fiche.updateOne({ _id: f._id }, { $set: { chambreLiberee: true } });
    }
    if (fiches.length) console.log(`🛏️  Libération auto : ${fiches.length} fiche(s) traitée(s), ${liberees} chambre(s) libérée(s).`);
}

function startLiberationJob() {
    if (process.env.DISABLE_CRON === 'true') return;

    const run = () => libererChambresExpirees().catch(err =>
        console.error('Libération des chambres :', err.message));

    cron.schedule('0 * * * *', run, { timezone: 'UTC' }); // toutes les heures
    setTimeout(run, 15000);                                // et 15 s après le démarrage
}

module.exports = { startLiberationJob, libererChambresExpirees };