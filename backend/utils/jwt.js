const jwt = require('jsonwebtoken');

// Génère un token JWT standard
exports.generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// Génère un token JWT Police (durée plus courte, clé différente)
exports.generatePoliceToken = (userId) => {
    return jwt.sign(
        { id: userId, scope: 'police' },
        process.env.JWT_POLICE_SECRET || process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_POLICE_EXPIRE || '1d' }
    );
};

// Envoie le token dans la réponse + cookie httpOnly optionnel
exports.sendToken = (user, statusCode, res) => {
    const token = exports.generateToken(user._id);

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
    };

    res
        .status(statusCode)
        .cookie('ss_token', token, cookieOptions)
        .json({
            success: true,
            token,
            user: user.toSafe(),
        });
};
