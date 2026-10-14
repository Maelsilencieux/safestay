const Hotel = require('../models/Hotel');

// Recalcule totalChambres / chambresOccupees (le hook pre('save') du modèle s'en charge)
async function recalculerTotaux(hotelId) {
    const hotel = await Hotel.findById(hotelId);
    if (hotel) await hotel.save();
}

/**
 * Réserve une chambre de façon ATOMIQUE.
 * La condition "disponible: true" et le passage à false se font en une seule
 * opération MongoDB : deux clients simultanés ne peuvent pas avoir la même chambre.
 * Retourne true si la réservation a réussi, false sinon.
 */
async function reserverChambre(hotelId, numero) {
    const res = await Hotel.updateOne(
        { _id: hotelId, chambres: { $elemMatch: { numero: String(numero), disponible: true } } },
        { $set: { 'chambres.$.disponible': false } }
    );
    const modifie = (res.modifiedCount ?? res.nModified ?? 0) === 1;
    if (modifie) await recalculerTotaux(hotelId);
    return modifie;
}

async function libererChambre(hotelId, numero) {
    await Hotel.updateOne(
        { _id: hotelId, 'chambres.numero': String(numero) },
        { $set: { 'chambres.$.disponible': true } }
    );
    await recalculerTotaux(hotelId);
}

module.exports = { reserverChambre, libererChambre, recalculerTotaux };