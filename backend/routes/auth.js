const express   = require('express');
const router    = express.Router();
const { body, validationResult } = require('express-validator');
const crypto    = require('crypto');

const User      = require('../models/User');
const Hotel     = require('../models/Hotel');
const { sendToken } = require('../utils/jwt');
const { protect }   = require('../middleware/auth');
const notify        = require('../utils/notify');
const email = require('../utils/email');
const sendMailRap = require('../utils/mailtrap');

//  Helpers
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, errors: errors.array() });
    }
    next();
};

// ============================================================
//  POST /api/auth/register/client
// ============================================================
router.post('/register/client', [
    body('nom').notEmpty().withMessage('Nom requis').trim(),
    body('prenom').notEmpty().withMessage('Prénom requis').trim(),
    body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Minimum 8 caractères'),
], validate, async (req, res) => {
    try {
        const { nom, prenom, email: mail, password, nationalite, telephone } = req.body;

        const exists = await User.findOne({ email: mail });
        if (exists) {
            return res.status(400).json({ success: false, message: 'Cet email est déjà utilisé.' });
        }

        const user = await User.create({
            role: 'client',
            nom, prenom,
            email: mail,
            password,
            telephone: telephone || '',
            nationalite,
            isActive: true,
            isVerified: true,
        });
        email.sendBienvenueClient(user).catch(console.error);
        console.debug('test de mail ', await sendMailRap(user.email,"Mail de bienvenue","Bienvenue sur safestay"))
        await sendMailRap(user.email,"Mail de bienvenue","Bienvenue sur safestay")

        // Notifier le superadmin d'une nouvelle inscription client
        const superadmin = await User.findOne({ role: 'superadmin' });
        if (superadmin) {
            notify.notifyNouvelleInscription(superadmin._id, `${prenom} ${nom} (client)`).catch(console.error);
        }

        sendToken(user, 201, res);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Erreur serveur.', error: err.message });
    }
});

// ============================================================
//  POST /api/auth/register/hotel
// ============================================================
router.post('/register/hotel', [
    body('nomHotel').notEmpty().withMessage('Nom de l\'hôtel requis').trim(),
    body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Minimum 8 caractères'),
    body('rccm').notEmpty().withMessage('RCCM requis').trim(),
    body('adresseHotel').notEmpty().withMessage('Adresse requise').trim(),
    body('villeHotel').notEmpty().withMessage('Ville requise').trim(),
], validate, async (req, res) => {
    let createdUser = null;
    try {
        const {
            nomHotel, email: mail, password, rccm,
            adresseHotel, villeHotel, telephone,
        } = req.body;

        const exists = await User.findOne({ email: mail });
        if (exists) {
            return res.status(400).json({ success: false, message: 'Cet email est déjà utilisé.' });
        }

        const user = await User.create({
            role: 'hotel',
            nomHotel, rccm,
            adresseHotel, villeHotel,
            email: mail, password,
            telephone: telephone || '',
            hotelStatus: 'pending',
            isActive: false,
            isVerified: false,
        });
        createdUser = user;

        await Hotel.create({
            user: user._id,
            nomHotel,
            adresse: adresseHotel,
            ville: villeHotel,
            telephone: telephone || '',
            email: mail,
            chambres: [],
        });

        email.sendHotelPending(user).catch(console.error);

        // Notifier le superadmin d'une nouvelle inscription hôtel
        const superadmin = await User.findOne({ role: 'superadmin' });
        if (superadmin) {
            notify.notifyNouvelleInscription(superadmin._id, nomHotel).catch(console.error);
        }

        res.status(201).json({
            success: true,
            message: 'Demande enregistrée. Votre compte sera activé après vérification de votre RCCM sous 24–48h.',
            hotelStatus: 'pending',
        });
    } catch (err) {
        // ⚠️ FIX : rollback — si le profil Hotel n'a pas pu être créé après
        // que le User ait été créé, on supprime le User pour éviter un
        // compte orphelin bloqué (email déjà "pris" sans profil utilisable).
        if (createdUser) {
            const hotelProfile = await Hotel.findOne({ user: createdUser._id }).catch(() => null);
            if (!hotelProfile) {
                await User.findByIdAndDelete(createdUser._id).catch(() => {});
            }
        }
        console.error(err);
        res.status(500).json({ success: false, message: 'Erreur serveur.', error: err.message });
    }
});

// ============================================================
//  POST /api/auth/login
// ============================================================
router.post('/login', [
    body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
    body('password').notEmpty().withMessage('Mot de passe requis'),
], validate, async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect.' });
        }

        const match = await user.matchPassword(password);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect.' });
        }

        if (user.role === 'hotel' && user.hotelStatus === 'pending') {
            return res.status(403).json({
                success: false,
                message: 'Votre compte hôtel est en attente de validation par SafeStay.',
                hotelStatus: 'pending',
            });
        }
        if (user.role === 'hotel' && user.hotelStatus === 'rejected') {
            return res.status(403).json({
                success: false,
                message: `Votre demande a été refusée : ${user.hotelRejectedReason || 'documents non conformes'}.`,
                hotelStatus: 'rejected',
            });
        }

        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Compte désactivé. Contactez le support.' });
        }

        sendToken(user, 200, res);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
});

// ============================================================
//  GET /api/auth/me
// ============================================================
router.get('/me', protect, async (req, res) => {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user: user.toSafe() });
});

// ============================================================
//  POST /api/auth/logout
// ============================================================
router.post('/logout', (req, res) => {
    res.cookie('ss_token', '', { httpOnly: true, expires: new Date(0) });
    res.json({ success: true, message: 'Déconnecté.' });
});

// ============================================================
//  POST /api/auth/forgot-password
// ============================================================
router.post('/forgot-password', [
    body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
], validate, async (req, res) => {
    try {
        const { email: mail } = req.body;
        const user = await User.findOne({ email: mail });

        const genericMsg = 'Si cet email existe dans notre système, un lien de réinitialisation a été envoyé.';

        if (!user) {
            return res.json({ success: true, message: genericMsg });
        }

        const rawToken    = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        user.resetToken       = hashedToken;
        user.resetTokenExpire = Date.now() + 30 * 60 * 1000;
        await user.save({ validateBeforeSave: false });

        const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}&email=${encodeURIComponent(mail)}`;

        // Envoi de l'email de réinitialisation
        email.sendResetPassword(user, resetUrl).catch(console.error);

        // Envoi de la notification Push (non bloquante)
        notify.notifyResetPassword(user._id, resetUrl).catch(console.error);

        res.json({ success: true, message: genericMsg });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
});

// ============================================================
//  GET /api/auth/verify-reset-token
// ============================================================
router.get('/verify-reset-token', async (req, res) => {
    try {
        const { token, email } = req.query;
       
        if (!token || !email) {
            return res.status(400).json({ success: false, message: 'Lien invalide.' });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            email: email,
            resetToken: hashedToken,
            resetTokenExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Lien invalide ou expiré.' });
        }

        res.json({ success: true, message: 'Token valide.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
});

// ============================================================
//  POST /api/auth/reset-password
// ============================================================
router.post('/reset-password', [
    body('token').notEmpty().withMessage('Token requis'),
    body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Minimum 8 caractères'),
], validate, async (req, res) => {
    try {
        const { token, email: mail, password } = req.body;

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            email: mail,
            resetToken: hashedToken,
            resetTokenExpire: { $gt: Date.now() },
        }).select('+password');

        if (!user) {
            return res.status(400).json({ success: false, message: 'Lien invalide ou expiré. Refaites une demande.' });
        }

        user.password         = password;
        user.resetToken       = undefined;
        user.resetTokenExpire = undefined;
        await user.save();
        email.sendPasswordChanged(user).catch(console.error);

        sendToken(user, 200, res);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
});

module.exports = router;