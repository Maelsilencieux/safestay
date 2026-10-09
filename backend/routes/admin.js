const express = require('express');
const router  = express.Router();

const User    = require('../models/User');
const Fiche   = require('../models/Fiche');
const { protect, authorize } = require('../middleware/auth');
const emailSvc = require('../utils/email');
const { notify } = require('../utils/notify');
const path = require('path');

// Toutes les routes admin nécessitent d'être superadmin
router.use(protect, authorize('superadmin'));

// Dossier racine des uploads (cohérent avec fiches.js)
const UPLOAD_ROOT = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');

// ============================================================
//  GET /api/admin/stats
//  Statistiques globales de la plateforme
// ============================================================
router.get('/stats', async (req, res) => {
    try {
        // l'ordre des requêtes Promise.all doit correspondre
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
//  Liste tous les hôtels (approuvés + en attente + refusés)
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
//  PATCH /api/admin/hotels/:userId/approuver
//  Approuver un compte hôtel
// ============================================================
router.patch('/hotels/:userId/approuver', async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.userId, role: 'hotel' });
        if (!user) return res.status(404).json({ success: false, message: 'Hôtel introuvable.' });

        if (user.hotelStatus === 'approved') {
            return res.status(400).json({ success: false, message: 'Cet hôtel est déjà approuvé.' });
        }

        user.hotelStatus = 'approved';
        user.isActive    = true;
        user.isVerified  = true;
        user.approvedAt  = new Date();
        user.approvedBy  = req.user._id;
        await user.save();

        //  un seul email d'approbation, `email` (non importé) 
        emailSvc.sendHotelApprouve(user).catch(console.error);

        // Notification in-app pour l'hôtel
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
//  Rejeter un compte hôtel
// ============================================================
router.patch('/hotels/:userId/rejeter', async (req, res) => {
    try {
        // ⚠️ FIX : le front envoie `motif`, pas `raison`.
        const { motif } = req.body;
        const user = await User.findOne({ _id: req.params.userId, role: 'hotel' });
        if (!user) return res.status(404).json({ success: false, message: 'Hôtel introuvable.' });

        user.hotelStatus         = 'rejected';
        user.isActive            = false;
        user.hotelRejectedReason = motif || 'Documents non conformes';
        await user.save();

        // ⚠️ FIX : `email` n'était pas importé (module s'appelle `emailSvc` ici).
        emailSvc.sendHotelRefuse(user, user.hotelRejectedReason).catch(console.error);

        // Notification in-app pour l'hôtel
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
//  Toutes les fiches (vue police / superadmin)
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
//  GET /api/admin/clients
//  Liste des clients
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
//  Liste de tous les utilisateurs
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
//  Activer / désactiver un compte (ajouté — le front l'appelait
//  déjà mais la route n'existait pas côté backend)
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
//  GET /api/admin/fiches/recent
//  5 dernières fiches (dashboard)
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
//  DELETE /api/admin/users/:userId
//  Désactiver un compte (soft delete)
// ============================================================
router.delete('/users/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
        if (user.role === 'superadmin') return res.status(400).json({ success: false, message: 'Impossible de supprimer un superadmin.' });

        user.isActive = false;
        await user.save();
        res.json({ success: true, message: 'Compte désactivé.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  GET /api/admin/documents
//  Tous les documents PDF
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
//  GET /api/admin/documents/:id/download
//  Télécharger un document (CNIB)
// ============================================================
router.get('/documents/:id/download', async (req, res) => {
    try {
        const fiche = await Fiche.findById(req.params.id);
        if (!fiche || !fiche.cnibFichier) {
            return res.status(404).json({ success: false, message: 'Document introuvable' });
        }

        // path.join sécurisé vers le dossier d'upload réel,
        const filePath = path.join(UPLOAD_ROOT, 'cnib', fiche.cnibFichier);
        res.download(filePath);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  GET /api/admin/documents/:id/view
//  Voir un document
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
//  GET /api/admin/documents/:id/fiche
//  Voir la fiche PDF
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
//  Télécharger la fiche PDF
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
//  Supprimer un document (référence + fichier physique)
// ============================================================
router.delete('/documents/:id', async (req, res) => {
    try {
        const fiche = await Fiche.findById(req.params.id);
        if (!fiche) return res.status(404).json({ success: false, message: 'Document introuvable' });

        // Supprimer le fichier physique s'il existe (évite les fichiers orphelins)
        if (fiche.cnibFichier) {
            const fs = require('fs');
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