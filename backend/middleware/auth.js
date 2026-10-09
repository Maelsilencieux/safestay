const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ============================================================
//  Middleware d'authentification JWT
// ============================================================

exports.protect = async (req, res, next) => {
    let token;

    // 1. Récupérer le token depuis l'en-tête Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    } 
    // 2. Fallback : Récupérer le token depuis les cookies (ss_token)
    else if (req.cookies && req.cookies.ss_token) {
        token = req.cookies.ss_token;
    }

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Non authentifié. Token manquant.' 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Utilisateur introuvable.' 
            });
        }

        if (!req.user.isActive) {
            return res.status(403).json({ 
                success: false, 
                message: 'Compte désactivé.' 
            });
        }

        next();
    } catch (err) {
        return res.status(401).json({ 
            success: false, 
            message: 'Token invalide ou expiré.' 
        });
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

    // Normalisation du rôle utilisateur et des rôles autorisés en minuscules
    const userRole = req.user.role.toString().toLowerCase().trim();
    const allowedRoles = roles.map(r => r.toLowerCase().trim());

    if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: `Accès refusé. Rôle requis : ${roles.join(' ou ')}. Votre rôle actuel : ${req.user.role}`,
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