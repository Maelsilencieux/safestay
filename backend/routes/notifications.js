const express = require('express');
const router  = express.Router();

const Notification = require('../models/Notification');
const { protect }  = require('../middleware/auth');

//  GET /api/notifications
//  Liste des notifications de l'utilisateur connecté
//  Query : ?unreadOnly=true pour ne récupérer que les non-lues

router.get('/', protect, async (req, res) => {
    try {
        const { unreadOnly, limit = 30 } = req.query;
        const filter = { user: req.user._id };
        if (unreadOnly === 'true') filter.isRead = false;

        const notifications = await Notification.find(filter)
            .sort('-createdAt')
            .limit(parseInt(limit))
            .populate('fiche', 'reference statut');

        const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });

        res.json({ success: true, notifications, unreadCount });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  GET /api/notifications/unread-count
//  Compteur rapide (pour la pastille de la cloche)
// ============================================================
router.get('/unread-count', protect, async (req, res) => {
    try {
        const count = await Notification.countDocuments({ user: req.user._id, isRead: false });
        res.json({ success: true, count });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  PATCH /api/notifications/:id/read
//  Marquer une notification comme lue
// ============================================================
router.patch('/:id/read', protect, async (req, res) => {
    try {
        const notif = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { isRead: true },
            { new: true }
        );
        if (!notif) return res.status(404).json({ success: false, message: 'Notification introuvable.' });
        res.json({ success: true, notification: notif });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  PATCH /api/notifications/read-all
//  Marquer toutes les notifications comme lues
// ============================================================
router.patch('/read-all', protect, async (req, res) => {
    try {
        await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
        res.json({ success: true, message: 'Toutes les notifications ont été marquées comme lues.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
//  DELETE /api/notifications/:id
// ============================================================
router.delete('/:id', protect, async (req, res) => {
    try {
        await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        res.json({ success: true, message: 'Notification supprimée.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;