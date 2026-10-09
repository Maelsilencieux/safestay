// scripts/backfillFichePdf.js
// ============================================================
//  Génère le PDF officiel pour toutes les fiches existantes qui
//  n'en ont pas encore (fiche.pdfFiche vide) — utile après coup
//  pour les fiches créées avant l'ajout de la génération
//  automatique, ou pendant une période où le modèle Fiche était
//  cassé.
//
//  Usage (depuis la racine du projet backend) :
//    node scripts/backfillFichePdf.js
// ============================================================

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Fiche = require('./models/Fiche');
const Hotel = require('./models/Hotel');
const { generateFichePdf } = require('./utils/PDFFiche');

async function run() {
    await connectDB();
    console.log('Connecté à MongoDB.');

    const fiches = await Fiche.find({
        $or: [{ pdfFiche: null }, { pdfFiche: { $exists: false } }, { pdfFiche: '' }],
    });

    console.log(`${fiches.length} fiche(s) sans PDF trouvée(s).`);

    let ok = 0;
    let fail = 0;

    for (const fiche of fiches) {
        try {
            const hotel = await Hotel.findById(fiche.hotel);
            if (!hotel) {
                console.warn(`⚠️  Fiche ${fiche.reference || fiche._id} : hôtel introuvable, ignorée.`);
                fail++;
                continue;
            }

            const pdfFilename = await generateFichePdf(fiche, hotel);
            fiche.pdfFiche = pdfFilename;
            await fiche.save();

            console.log(`✅ ${fiche.reference || fiche._id} → ${pdfFilename}`);
            ok++;
        } catch (err) {
            console.error(`❌ Erreur pour la fiche ${fiche.reference || fiche._id} :`, err.message);
            fail++;
        }
    }

    console.log(`\nTerminé : ${ok} PDF générés, ${fail} échec(s).`);
    await mongoose.disconnect();
    process.exit(0);
}

run().catch((err) => {
    console.error('Erreur fatale du script :', err);
    process.exit(1);
});