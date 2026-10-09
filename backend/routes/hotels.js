const express = require('express');
const router  = express.Router();
const { body, validationResult } = require('express-validator');

const Hotel   = require('../models/Hotel');
const { protect, authorize, hotelApproved } = require('../middleware/auth');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
    next();
};

// ============================================================
//  GET /api/hotels
//  Liste des hôtels approuvés (pour dropdown du formulaire client)
// ============================================================
router.get('/', async (req, res) => {
    try {
        const hotels = await Hotel.find()
            .populate('user', 'hotelStatus isActive')
            .select('nomHotel ville adresse etoiles chambres');

        // Filtrer uniquement les hôtels approuvés et actifs
        const actifs = hotels.filter(h => h.user && h.user.hotelStatus === 'approved' && h.user.isActive);

        res.json({
            success: true,
            count: actifs.length,
            hotels: actifs.map(h => ({
                _id: h._id,
                nomHotel: h.nomHotel,
                ville: h.ville,
                adresse: h.adresse,
                etoiles: h.etoiles,
                // Chambres disponibles uniquement
                chambresDisponibles: h.chambres.filter(c => c.disponible).map(c => ({
                    _id: c._id,
                    numero: c.numero,
                    type: c.type,
                    etage: c.etage,
                    prix: c.prix,
                })),
            })),
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  GET /api/hotels/:id/chambres
//  Liste des chambres disponibles d'un hôtel (pour dropdown)
// ============================================================
router.get('/:id/chambres', async (req, res) => {
    try {
        const hotel = await Hotel.findById(req.params.id);
        if (!hotel) return res.status(404).json({ success: false, message: 'Hôtel introuvable.' });

        const disponibles = hotel.chambres.filter(c => c.disponible);
        res.json({ success: true, chambres: disponibles });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  GET /api/hotels/mon-hotel
//  Profil de l'hôtel connecté
// ============================================================
router.get('/mon-hotel', protect, authorize('hotel'), hotelApproved, async (req, res) => {
    try {
        const hotel = await Hotel.findOne({ user: req.user._id });
        if (!hotel) return res.status(404).json({ success: false, message: 'Profil hôtel introuvable.' });
        res.json({ success: true, hotel });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  PUT /api/hotels/mon-hotel
//  Mettre à jour les infos de l'hôtel connecté
// ============================================================
router.put('/mon-hotel', protect, authorize('hotel'), hotelApproved, async (req, res) => {
    try {
        const { adresse, ville, telephone, etoiles } = req.body;
        const hotel = await Hotel.findOneAndUpdate(
            { user: req.user._id },
            { $set: { adresse, ville, telephone, etoiles } },
            { new: true, runValidators: true }
        );
        res.json({ success: true, hotel });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  POST /api/hotels/mon-hotel/chambres
//  Ajouter une chambre (admin réseau hôtel)
// ============================================================
router.post('/mon-hotel/chambres', protect, authorize('hotel'), hotelApproved, [
    body('numero').notEmpty().withMessage('Numéro de chambre requis'),
], validate, async (req, res) => {
    try {
        const { numero, type, etage, prix, description } = req.body;

        const hotel = await Hotel.findOne({ user: req.user._id });
        if (!hotel) return res.status(404).json({ success: false, message: 'Hôtel introuvable.' });

        // Vérifier unicité du numéro
        const existe = hotel.chambres.find(c => c.numero === numero);
        if (existe) return res.status(400).json({ success: false, message: `Chambre ${numero} existe déjà.` });

        hotel.chambres.push({ numero, type: type || 'Simple', etage: etage || 0, prix: prix || 0, description, disponible: true });
        await hotel.save();

        res.status(201).json({ success: true, message: 'Chambre ajoutée.', hotel });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  PUT /api/hotels/mon-hotel/chambres/:chambreId
//  Modifier une chambre (disponibilité, prix, etc.)
// ============================================================
router.put('/mon-hotel/chambres/:chambreId', protect, authorize('hotel'), hotelApproved, async (req, res) => {
    try {
        const hotel = await Hotel.findOne({ user: req.user._id });
        if (!hotel) return res.status(404).json({ success: false, message: 'Hôtel introuvable.' });

        const chambre = hotel.chambres.id(req.params.chambreId);
        if (!chambre) return res.status(404).json({ success: false, message: 'Chambre introuvable.' });

        const { disponible, prix, type, description } = req.body;
        if (disponible !== undefined) chambre.disponible = disponible;
        if (prix !== undefined) chambre.prix = prix;
        if (type) chambre.type = type;
        if (description) chambre.description = description;

        await hotel.save();
        res.json({ success: true, message: 'Chambre mise à jour.', chambre });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  DELETE /api/hotels/mon-hotel/chambres/:chambreId
//  Supprimer une chambre
// ============================================================
router.delete('/mon-hotel/chambres/:chambreId', protect, authorize('hotel'), hotelApproved, async (req, res) => {
    try {
        const hotel = await Hotel.findOne({ user: req.user._id });
        if (!hotel) return res.status(404).json({ success: false, message: 'Hôtel introuvable.' });

        hotel.chambres = hotel.chambres.filter(c => c._id.toString() !== req.params.chambreId);
        await hotel.save();
        res.json({ success: true, message: 'Chambre supprimée.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;