const express   = require('express');
const router    = express.Router();
const { body, validationResult } = require('express-validator');
const crypto    = require('crypto');
const rateLimit = require('express-rate-limit');

const User      = require('../models/User');
const Hotel     = require('../models/Hotel');
const { sendToken } = require('../utils/jwt');
const { protect }   = require('../middleware/auth');
const notify        = require('../utils/notify');
const email = require('../utils/email');
const sendMailRap = require('../utils/mailtrap');
const { serverError } = require('../utils/http');

//  Helpers
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, errors: errors.array() });
    }
    next();
};

// Règle unique pour les mots de passe (changement + réinitialisation)
function erreurMotDePasse(pwd) {
    if (typeof pwd !== 'string' || pwd.length < 8 || pwd.length > 128 ||
        !/[A-Za-z]/.test(pwd) || !/\d/.test(pwd)) {
        return 'Le mot de passe doit contenir entre 8 et 128 caractères, avec des lettres et des chiffres.';
    }
    return null;
}

// ============================================================
//  Vérification de l'e-mail : code à 6 chiffres
// ============================================================
const CODE_TTL_MS     = 10 * 60 * 1000;  // validité du code
const MAX_ATTEMPTS    = 5;               // essais avant de demander un nouveau code
const RESEND_DELAY_MS = 60 * 1000;       // délai minimum entre deux envois

const CHAMPS_CODE = '+emailCodeHash +emailCodeExpire +emailCodeAttempts +emailCodeSentAt';

// Le code n'est jamais stocké en clair
const hashCode = (mail, code) =>
    crypto.createHmac('sha256', process.env.JWT_SECRET || 'dev-secret')
        .update(`${mail}:${code}`).digest('hex');

function memeValeur(a, b) {
    const x = Buffer.from(String(a));
    const y = Buffer.from(String(b));
    return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Génère, enregistre et envoie un code. Retourne true si l'e-mail est parti.
async function envoyerCode(user) {
    const code = String(crypto.randomInt(100000, 1000000));

    user.emailCodeHash     = hashCode(user.email, code);
    user.emailCodeExpire   = new Date(Date.now() + CODE_TTL_MS);
    user.emailCodeAttempts = 0;
    user.emailCodeSentAt   = new Date();
    await user.save({ validateBeforeSave: false });

    if (process.env.NODE_ENV !== 'production') {
        console.log(`🔑 Code de vérification pour ${user.email} : ${code}`);
    }

    try {
        await sendMailRap(
            user.email,
            'Votre code de vérification SafeStay',
            `Votre code de vérification SafeStay est : ${code}\n\n` +
            `Il est valable 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`
        );
        return true;
    } catch (err) {
        console.error('Envoi du code de vérification :', err.message);
        return false;
    }
}

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
            // Compte jamais vérifié : on le remplace (le vrai propriétaire de l'e-mail peut s'inscrire)
            if (exists.role === 'client' && exists.emailVerified === false) {
                await User.deleteOne({ _id: exists._id });
            } else {
                return res.status(400).json({ success: false, message: 'Cet email est déjà utilisé.' });
            }
        }

        const user = await User.create({
            role: 'client',
            nom, prenom,
            email: mail,
            password,
            telephone: telephone || '',
            nationalite,
            isActive: true,
            isVerified: false,
            emailVerified: false,
        });

        const emailSent = await envoyerCode(user);

        res.status(201).json({
            success: true,
            needsVerification: true,
            email: user.email,
            emailSent,
            message: emailSent
                ? 'Un code de vérification a été envoyé à votre adresse e-mail.'
                : "Compte créé, mais l'e-mail n'a pas pu être envoyé. Utilisez « Renvoyer le code ».",
        });
    } catch (err) {
        serverError(res, err);
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
            if (exists.role === 'hotel' && exists.emailVerified === false) {
                await Hotel.deleteOne({ user: exists._id });
                await User.deleteOne({ _id: exists._id });
            } else {
                return res.status(400).json({ success: false, message: 'Cet email est déjà utilisé.' });
            }
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
            emailVerified: false,
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

        const emailSent = await envoyerCode(user);

        res.status(201).json({
            success: true,
            needsVerification: true,
            email: user.email,
            emailSent,
            hotelStatus: 'pending',
            message: emailSent
                ? 'Un code de vérification a été envoyé à votre adresse e-mail.'
                : "Demande enregistrée, mais l'e-mail n'a pas pu être envoyé. Utilisez « Renvoyer le code ».",
        });
    } catch (err) {
        // Rollback : évite un compte orphelin si le profil Hotel n'a pas pu être créé
        if (createdUser) {
            const hotelProfile = await Hotel.findOne({ user: createdUser._id }).catch(() => null);
            if (!hotelProfile) {
                await User.findByIdAndDelete(createdUser._id).catch(() => {});
            }
        }
        serverError(res, err);
    }
});

// ============================================================
//  POST /api/auth/verify-email
// ============================================================
router.post('/verify-email', [
    body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
    body('code').matches(/^\d{6}$/).withMessage('Le code doit contenir 6 chiffres.'),
], validate, async (req, res) => {
    try {
        const { email: mail, code } = req.body;

        const user = await User.findOne({ email: mail }).select(CHAMPS_CODE);

        if (!user || user.emailVerified !== false || !user.emailCodeHash) {
            return res.status(400).json({ success: false, message: 'Code invalide ou expiré.' });
        }
        if (!user.emailCodeExpire || user.emailCodeExpire < new Date()) {
            return res.status(400).json({ success: false, message: 'Code expiré. Demandez un nouveau code.' });
        }
        if ((user.emailCodeAttempts || 0) >= MAX_ATTEMPTS) {
            return res.status(429).json({ success: false, message: 'Trop d\'essais. Demandez un nouveau code.' });
        }

        if (!memeValeur(hashCode(user.email, code), user.emailCodeHash)) {
            user.emailCodeAttempts = (user.emailCodeAttempts || 0) + 1;
            await user.save({ validateBeforeSave: false });
            const restants = Math.max(MAX_ATTEMPTS - user.emailCodeAttempts, 0);
            return res.status(400).json({
                success: false,
                message: restants > 0
                    ? `Code incorrect. ${restants} essai(s) restant(s).`
                    : 'Code incorrect. Demandez un nouveau code.',
            });
        }

        // Code correct
        user.emailVerified     = true;
        user.emailCodeHash     = undefined;
        user.emailCodeExpire   = undefined;
        user.emailCodeAttempts = 0;
        user.emailCodeSentAt   = undefined;
        if (user.role === 'client') user.isVerified = true; // pour un hôtel, c'est l'approbation du superadmin
        await user.save({ validateBeforeSave: false });

        // Mails et notifications envoyés seulement maintenant que l'e-mail est confirmé
        const superadmin = await User.findOne({ role: 'superadmin' });
        if (user.role === 'client') {
            email.sendBienvenueClient(user).catch(console.error);
            if (superadmin) {
                notify.notifyNouvelleInscription(superadmin._id, `${user.prenom} ${user.nom} (client)`).catch(console.error);
            }
        } else if (user.role === 'hotel') {
            email.sendHotelPending(user).catch(console.error);
            if (superadmin) {
                notify.notifyNouvelleInscription(superadmin._id, user.nomHotel).catch(console.error);
            }
        }

        const message = user.role === 'hotel'
            ? 'E-mail vérifié. Votre demande sera examinée par SafeStay sous 24–48h.'
            : 'E-mail vérifié. Bienvenue sur SafeStay !';

        // Client : connexion directe (il vient de prouver qu'il possède l'adresse)
        if (user.role === 'client') {
            return sendToken(user, 200, res, { role: user.role, message, loggedIn: true });
        }
        // Hôtel : pas de session, il attend l'approbation du superadmin
        res.json({ success: true, role: user.role, message, loggedIn: false });
    } catch (err) {
        serverError(res, err);
    }
});

// ============================================================
//  POST /api/auth/resend-code
// ============================================================
router.post('/resend-code', [
    body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
], validate, async (req, res) => {
    try {
        const { email: mail } = req.body;
        const generique = {
            success: true,
            message: 'Si un compte en attente de vérification existe pour cet e-mail, un nouveau code a été envoyé.',
        };

        const user = await User.findOne({ email: mail }).select(CHAMPS_CODE);
        if (!user || user.emailVerified !== false) return res.json(generique);

        if (user.emailCodeSentAt && Date.now() - user.emailCodeSentAt.getTime() < RESEND_DELAY_MS) {
            return res.status(429).json({ success: false, message: 'Patientez une minute avant de redemander un code.' });
        }

        await envoyerCode(user);
        res.json(generique);
    } catch (err) {
        serverError(res, err);
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

        // E-mail pas encore vérifié (403 et non 401 : le front déconnecte sur tout 401)
        if (user.emailVerified === false) {
            return res.status(403).json({
                success: false,
                code: 'EMAIL_NOT_VERIFIED',
                email: user.email,
                message: 'Veuillez vérifier votre adresse e-mail avant de vous connecter.',
            });
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
        serverError(res, err);
    }
});

// ============================================================
//  GET /api/auth/me
// ============================================================
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(401).json({ success: false, message: 'Utilisateur introuvable.' });
        res.json({ success: true, user: user.toSafe() });
    } catch (err) {
        serverError(res, err);
    }
});

// ============================================================
//  PATCH /api/auth/change-password
// ============================================================
// Compteur PAR UTILISATEUR (le front passe par le proxy Next.js : l'IP ne distingue pas les hôtels)
const changePasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => req.user._id.toString(),
    message: { success: false, message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});

router.patch('/change-password', protect, changePasswordLimiter, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, message: 'Tous les champs sont obligatoires.' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'La confirmation ne correspond pas au nouveau mot de passe.' });
        }
        const erreur = erreurMotDePasse(newPassword);
        if (erreur) return res.status(400).json({ success: false, message: erreur });

        const user = await User.findById(req.user._id).select('+password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
        }

        // 400 et non 401 : le front déconnecte l'utilisateur sur toute réponse 401
        const match = await user.matchPassword(currentPassword);
        if (!match) {
            return res.status(400).json({ success: false, message: 'Mot de passe actuel incorrect.' });
        }

        if (await user.matchPassword(newPassword)) {
            return res.status(400).json({ success: false, message: 'Le nouveau mot de passe doit être différent de l\'ancien.' });
        }

        user.password = newPassword;                              // haché par le hook pre('save')
        user.passwordChangedAt = new Date(Date.now() - 1000);     // invalide les anciens tokens
        user.mustChangePassword = false;
        await user.save();

        email.sendPasswordChanged(user).catch(console.error);

        sendToken(user, 200, res);   // nouveau token : la session actuelle reste ouverte
    } catch (err) {
        serverError(res, err);
    }
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

        email.sendResetPassword(user, resetUrl).catch(console.error);
        notify.notifyResetPassword(user._id, resetUrl).catch(console.error);

        res.json({ success: true, message: genericMsg });
    } catch (err) {
        serverError(res, err);
    }
});

// ============================================================
//  GET /api/auth/verify-reset-token
// ============================================================
router.get('/verify-reset-token', async (req, res) => {
    try {
        const { token, email } = req.query;

        if (typeof token !== 'string' || typeof email !== 'string' || !token || !email) {
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
        serverError(res, err);
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

        const erreur = erreurMotDePasse(password);
        if (erreur) return res.status(400).json({ success: false, message: erreur });

        const hashedToken = crypto.createHash('sha256').update(String(token)).digest('hex');

        const user = await User.findOne({
            email: mail,
            resetToken: hashedToken,
            resetTokenExpire: { $gt: Date.now() },
        }).select('+password');

        if (!user) {
            return res.status(400).json({ success: false, message: 'Lien invalide ou expiré. Refaites une demande.' });
        }

        user.password          = password;
        user.resetToken        = undefined;
        user.resetTokenExpire  = undefined;
        user.passwordChangedAt = new Date(Date.now() - 1000);
        user.mustChangePassword = false;
        await user.save();
        email.sendPasswordChanged(user).catch(console.error);

        sendToken(user, 200, res);
    } catch (err) {
        serverError(res, err);
    }
});

module.exports = router;