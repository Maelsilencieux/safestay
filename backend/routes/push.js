// routes/push.js
const express      = require('express');
const router       = express.Router();
const Subscription = require('../models/Subscription');
const { protect }  = require('../middleware/auth');

// POST /api/push/subscribe
router.post('/subscribe', protect, async (req, res) => {
    try {
        const { subscription } = req.body;
        if (!subscription?.endpoint) {
            return res.status(400).json({ success: false, message: 'Subscription invalide.' });
        }

        // Upsert — évite les doublons
        console.log("Utilisateur :", req.user);
        console.log("Subscription :", subscription);

        await Subscription.findOneAndUpdate(
            { user: req.user._id, 'subscription.endpoint': subscription.endpoint },
            { user: req.user._id, subscription },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: 'Subscription enregistrée.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/push/unsubscribe
router.delete('/unsubscribe', protect, async (req, res) => {
    try {
        await Subscription.deleteMany({ user: req.user._id });
        res.json({ success: true, message: 'Désinscrit.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/push/vapid-public-key
router.get('/vapid-public-key', (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

module.exports = router;