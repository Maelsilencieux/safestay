const express = require('express');
const router  = express.Router();

const crypto = require('crypto');
const path   = require('path');
const fs     = require('fs');
const validator = require('validator'); 
const Hotel  = require('../models/Hotel');
const User   = require('../models/User');
const Fiche  = require('../models/Fiche');
const { protect, authorize } = require('../middleware/auth');
const emailSvc = require('../utils/email');
const { notify } = require('../utils/notify');

// Toutes les routes admin nécessitent d'être superadmin
router.use(protect, authorize('superadmin'));

// Dossier racine des uploads (cohérent avec fiches.js)
const UPLOAD_ROOT = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');

// ============================================================
//  GET /api/admin/stats
// ============================================================
router.get('/stats', async (req, res) => {
    try {
        const [
            totalClients,
            totalHotels,
            hotelsPending,
            hotelsApproved,
            hotelsRejected,
            totalFiches,
            fichesPending,
            fichesRegistered,
            fichesRefused,
            fichesTransmitted,
            activeUsers,
            inactiveUsers,
        ] = await Promise.all([
            User.countDocuments({ role: 'client' }),
            User.countDocuments({ role: 'hotel' }),
            User.countDocuments({ role: 'hotel', hotelStatus: 'pending' }),
            User.countDocuments({ role: 'hotel', hotelStatus: 'approved' }),
            User.countDocuments({ role: 'hotel', hotelStatus: 'rejected' }),
            Fiche.countDocuments(),
            Fiche.countDocuments({ statut: 'pending' }),
            Fiche.countDocuments({ statut: 'registered' }),
            Fiche.countDocuments({ statut: 'refused' }),
            Fiche.countDocuments({ statut: 'transmitted' }),
            User.countDocuments({ isActive: true }),
            User.countDocuments({ isActive: false }),
        ]);

        res.json({
            success: true,
            stats: {
                totalClients, totalHotels,
                hotelsPending, hotelsApproved, hotelsRejected,
                totalFiches, fichesPending,
                fichesRegistered, fichesRefused, fichesTransmitted,
                activeUsers, inactiveUsers,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  GET /api/admin/hotels
// ============================================================
router.get('/hotels', async (req, res) => {
    try {
        const { statut } = req.query;
        const filter = { role: 'hotel' };
        if (statut) filter.hotelStatus = statut;

        const hotels = await User.find(filter)
            .select('-password')
            .sort('-createdAt');

        res.json({ success: true, count: hotels.length, hotels });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  POST /api/admin/hotels
//  Créer un hôtel (nom, téléphone, RCCM, ville, e-mail obligatoires)
// ============================================================
router.post('/hotels', async (req, res) => {
    try {
        const nomHotel   = (req.body.nomHotel  || '').trim();
        const telephone  = (req.body.telephone || '').trim();
        const rccm       = (req.body.rccm      || '').trim();
        const ville      = (req.body.ville     || '').trim();
        //const emailSaisi = (req.body.email     || '').trim().toLowerCase();
        const emailSaisi = (asString(req.body.email, 150) || '').trim().toLowerCase();

        if (!nomHotel || !telephone || !rccm || !ville || !emailSaisi) {
            return res.status(400).json({
                success: false,
                message: 'Nom, téléphone, RCCM, ville et e-mail sont obligatoires.',
            });
        }

        if (!/^[+\d][\d\s.-]{5,19}$/.test(telephone)) {
            return res.status(400).json({ success: false, message: 'Numéro de téléphone invalide.' });
        }

        if (await User.findOne({ role: 'hotel', rccm })) {
            return res.status(409).json({ success: false, message: 'Un hôtel avec ce numéro RCCM existe déjà.' });
        }

        // MODIFICATION 1 : l'e-mail saisi est utilisé tel quel
    
        if (!validator.isEmail(emailSaisi)) {
           return res.status(400).json({ success: false, message: 'E-mail invalide.' });
        }

        const email = validator.normalizeEmail(emailSaisi) || emailSaisi;
            if (await User.findOne({ email })) {
           return res.status(409).json({ success: false, message: 'Cet e-mail est déjà utilisé.' });
        }

        // Mot de passe temporaire (haché par le hook pre('save') du modèle User)
        const motDePasseTemporaire = crypto.randomBytes(9).toString('base64url');

        const user = await User.create({
            role: 'hotel',
            email,
            password: motDePasseTemporaire,
            nomHotel,
            telephone,
            rccm,
            villeHotel: ville,
            hotelStatus: 'approved',
            isActive: true,
            isVerified: true,
            mustChangePassword: true,
            approvedAt: new Date(),
            approvedBy: req.user._id,
        });

        // Crée le document Hotel lié au compte
        try {
            const existe = await Hotel.findOne({ user: user._id });
            if (!existe) {
                await Hotel.create({ user: user._id, nomHotel, ville, telephone, email });
            }
        } catch (hotelErr) {
            await User.findByIdAndDelete(user._id); // évite un compte à moitié créé
            throw hotelErr;
        }

        res.status(201).json({
            success: true,
            message: `Hôtel "${nomHotel}" créé.`,
            // MODIFICATION 2 : on renvoie simplement l'e-mail
            hotel: { _id: user._id, nomHotel, email },
            motDePasseTemporaire,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  PATCH /api/admin/hotels/:userId/approuver
// ============================================================
router.patch('/hotels/:userId/approuver', async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.userId, role: 'hotel' });
        if (!user) return res.status(404).json({ success: false, message: 'Hôtel introuvable.' });

        if (user.hotelStatus === 'approved') {
            return res.status(400).json({ success: false, message: 'Cet hôtel est déjà approuvé.' });
                    if (user.emailVerified === false) {
            return res.status(400).json({
                success: false,
                message: "L'e-mail de cet établissement n'a pas encore été vérifié.",
            });
        }
        }

        user.hotelStatus = 'approved';
        user.isActive    = true;
        user.isVerified  = true;
        user.approvedAt  = new Date();
        user.approvedBy  = req.user._id;
        await user.save();

        emailSvc.sendHotelApprouve(user).catch(console.error);

        notify({
            user:    user._id,
            type:    'hotel_approved',
            title:   '✅ Compte hôtel approuvé',
            message: `Votre établissement "${user.nomHotel}" a été approuvé. Vous pouvez gérer vos chambres et fiches clients.`,
            link:    'adminhot.html',
        }).catch(console.error);

        res.json({ success: true, message: `Hôtel "${user.nomHotel}" approuvé.`, user: user.toSafe() });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  PATCH /api/admin/hotels/:userId/rejeter
// ============================================================
router.patch('/hotels/:userId/rejeter', async (req, res) => {
    try {
        const { motif } = req.body;
        const user = await User.findOne({ _id: req.params.userId, role: 'hotel' });
        if (!user) return res.status(404).json({ success: false, message: 'Hôtel introuvable.' });

        user.hotelStatus         = 'rejected';
        user.isActive            = false;
        user.hotelRejectedReason = motif || 'Documents non conformes';
        await user.save();

        emailSvc.sendHotelRefuse(user, user.hotelRejectedReason).catch(console.error);

        notify({
            user:    user._id,
            type:    'hotel_rejected',
            title:   '❌ Demande hôtel refusée',
            message: `Votre demande pour "${user.nomHotel}" a été refusée. Motif : ${user.hotelRejectedReason}`,
        }).catch(console.error);

        res.json({ success: true, message: `Hôtel "${user.nomHotel}" rejeté.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  GET /api/admin/fiches
// ============================================================
router.get('/fiches', async (req, res) => {
    try {
        const { statut, page = 1, limit = 50 } = req.query;
        const filter = {};
        if (statut) filter.statut = statut;

        const fiches = await Fiche.find(filter)
            .populate('client', 'nom prenom email')
            .populate('hotel', 'nomHotel ville')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Fiche.countDocuments(filter);

        res.json({
            success: true,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            fiches,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  GET /api/admin/fiches/recent
// ============================================================
router.get('/fiches/recent', async (req, res) => {
    try {
        const fiches = await Fiche.find()
            .populate('client', 'nom prenom')
            .populate('hotel', 'nomHotel')
            .sort('-createdAt')
            .limit(5);

        res.json({ success: true, fiches });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  GET /api/admin/clients
// ============================================================
router.get('/clients', async (req, res) => {
    try {
        const clients = await User.find({ role: 'client' })
            .select('-password')
            .sort('-createdAt');
        res.json({ success: true, count: clients.length, clients });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  GET /api/admin/users
// ============================================================
router.get('/users', async (req, res) => {
    try {
        const { role } = req.query;
        const filter = {};
        if (role) filter.role = role;

        const users = await User.find(filter)
            .select('-password')
            .sort('-createdAt');

        res.json({ success: true, count: users.length, users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  PATCH /api/admin/users/:userId/toggle
//  Activer / désactiver un compte
// ============================================================
router.patch('/users/:userId/toggle', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
        if (user.role === 'superadmin') {
            return res.status(400).json({ success: false, message: 'Impossible de modifier un superadmin.' });
        }

        user.isActive = !user.isActive;
        await user.save();

        res.json({
            success: true,
            message: `Compte ${user.isActive ? 'activé' : 'désactivé'}.`,
            user: user.toSafe(),
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  DELETE /api/admin/users/:userId/definitif
//  Suppression définitive — refusée si des fiches existent
// ============================================================
router.delete('/users/:userId/definitif', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });

        if (user.role === 'superadmin') {
            return res.status(400).json({ success: false, message: 'Impossible de supprimer un superadmin.' });
        }

        const filtreFiches = user.role === 'hotel'
            ? { hotelUser: user._id }
            : { client: user._id };
        const nbFiches = await Fiche.countDocuments(filtreFiches);

        if (nbFiches > 0) {
            return res.status(409).json({
                success: false,
                message: `Suppression impossible : ce compte est lié à ${nbFiches} fiche(s) d'hébergement. Désactivez-le à la place.`,
            });
        }

        if (user.role === 'hotel') {
            await Hotel.deleteOne({ user: user._id });
        }
        await User.findByIdAndDelete(user._id);

        res.json({ success: true, message: 'Compte supprimé définitivement.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  DELETE /api/admin/users/:userId
//  Désactiver un compte (soft delete)
// ============================================================
router.delete('/users/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
        if (user.role === 'superadmin') {
            return res.status(400).json({ success: false, message: 'Impossible de supprimer un superadmin.' });
        }

        user.isActive = false;
        await user.save();
        res.json({ success: true, message: 'Compte désactivé.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  GET /api/admin/documents
// ============================================================
router.get('/documents', async (req, res) => {
    try {
        const fiches = await Fiche.find()
            .populate('client', 'nom prenom email')
            .populate('hotel', 'nomHotel')
            .sort('-createdAt');

        const documents = fiches.map(f => ({
            _id: f._id,
            client: f.client,
            hotel: f.hotel,
            reference: f.reference,
            cnib: f.cnibFichier,
            fichePdf: f.pdfFiche,
            createdAt: f.createdAt,
        }));

        res.json({ success: true, count: documents.length, documents });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  GET /api/admin/documents/:id/download   (CNIB)
// ============================================================
router.get('/documents/:id/download', async (req, res) => {
    try {
        const fiche = await Fiche.findById(req.params.id);
        if (!fiche || !fiche.cnibFichier) {
            return res.status(404).json({ success: false, message: 'Document introuvable' });
        }

        const filePath = path.join(UPLOAD_ROOT, 'cnib', fiche.cnibFichier);
        res.download(filePath);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  GET /api/admin/documents/:id/view   (CNIB)
// ============================================================
router.get('/documents/:id/view', async (req, res) => {
    try {
        const fiche = await Fiche.findById(req.params.id);
        if (!fiche || !fiche.cnibFichier) {
            return res.status(404).json({ success: false, message: 'Document introuvable' });
        }

        const filePath = path.join(UPLOAD_ROOT, 'cnib', fiche.cnibFichier);
        return res.sendFile(filePath);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  GET /api/admin/documents/:id/fiche   (voir la fiche PDF)
// ============================================================
router.get('/documents/:id/fiche', async (req, res) => {
    try {
        const fiche = await Fiche.findById(req.params.id);
        if (!fiche) return res.status(404).json({ success: false, message: 'Fiche introuvable' });
        if (!fiche.pdfFiche) return res.status(404).json({ success: false, message: 'PDF inexistant' });

        const filePath = path.join(UPLOAD_ROOT, 'fiches', fiche.pdfFiche);
        res.sendFile(filePath);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  GET /api/admin/documents/:id/download-fiche
// ============================================================
router.get('/documents/:id/download-fiche', async (req, res) => {
    try {
        const fiche = await Fiche.findById(req.params.id);
        if (!fiche || !fiche.pdfFiche) {
            return res.status(404).json({ success: false, message: 'Document introuvable' });
        }

        const filePath = path.join(UPLOAD_ROOT, 'fiches', fiche.pdfFiche);
        res.download(filePath);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  DELETE /api/admin/documents/:id
//  Supprimer la CNIB (référence + fichier physique)
// ============================================================
router.delete('/documents/:id', async (req, res) => {
    try {
        const fiche = await Fiche.findById(req.params.id);
        if (!fiche) return res.status(404).json({ success: false, message: 'Document introuvable' });

        if (fiche.cnibFichier) {
            const filePath = path.join(UPLOAD_ROOT, 'cnib', fiche.cnibFichier);
            fs.unlink(filePath, (err) => { if (err) console.error(err); });
        }

        fiche.cnibFichier = null;
        await fiche.save();

        res.json({ success: true, message: 'Document supprimé.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;