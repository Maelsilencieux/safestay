const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ============================================================
//  Middleware d'authentification JWT
// ============================================================
exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.ss_token) {
        token = req.cookies.ss_token;
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Non authentifié. Token manquant.' });
    }

    try {
        // Algorithme imposé : refuse les jetons signés autrement
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

        // Un jeton police ne doit pas ouvrir les routes classiques
        if (decoded.scope === 'police') {
            return res.status(401).json({ success: false, message: 'Token invalide pour cette ressource.' });
        }

        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Utilisateur introuvable.' });
        }

        // Compte désactivé / hôtel suspendu : accès coupé immédiatement
        if (!req.user.isActive) {
            return res.status(401).json({
                success: false,
                code: 'ACCOUNT_DISABLED',
                message: 'Compte désactivé.',
            });
        }

        // Refuser les jetons émis avant le dernier changement de mot de passe
        if (
            req.user.passwordChangedAt &&
            decoded.iat * 1000 < req.user.passwordChangedAt.getTime()
        ) {
            return res.status(401).json({
                success: false,
                message: 'Mot de passe modifié récemment. Veuillez vous reconnecter.',
            });
        }

        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Token invalide ou expiré.' });
    }
};

// ============================================================
//  Guards de rôle – insensibles à la casse
//  Usage : authorize('hotel', 'superadmin')
// ============================================================
exports.authorize = (...roles) => (req, res, next) => {
    if (!req.user || !req.user.role) {
        return res.status(403).json({
            success: false,
            message: 'Accès refusé. Aucun rôle associé à cet utilisateur.',
        });
    }

    const userRole = req.user.role.toString().toLowerCase().trim();
    const allowedRoles = roles.map(r => r.toLowerCase().trim());

    if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: `Accès refusé. Rôle requis : ${roles.join(' ou ')}.`,
        });
    }
    next();
};

// ============================================================
//  Guard spécifique hôtel approuvé
// ============================================================
exports.hotelApproved = (req, res, next) => {
    const userRole = req.user?.role?.toString().toLowerCase().trim();

    if (userRole === 'hotel' && req.user.hotelStatus !== 'approved') {
        return res.status(403).json({
            success: false,
            message: 'Votre compte hôtel est en attente de validation par SafeStay.',
            hotelStatus: req.user.hotelStatus,
        });
    }
    next();
};