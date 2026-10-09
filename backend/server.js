require('dotenv').config();

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const mongoose    = require('mongoose');

const connectDB   = require('./config/db');
const User        = require('./models/User');

// ===== Routes =====
const authRoutes   = require('./routes/auth');
const hotelRoutes  = require('./routes/hotels');
const ficheRoutes  = require('./routes/fiches');
const adminRoutes  = require('./routes/admin');
const notifRoutes  = require('./routes/notifications');

// ===== Init =====
const app = express();
connectDB();

// ============================================================
//  SÉCURITÉ
// ============================================================
app.use(helmet());

// Rate limiting global
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Trop de requêtes. Réessayez dans 15 minutes.' },
}));

// Rate limiting strict sur l'authentification
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
});

// ============================================================
//  MIDDLEWARES
// ============================================================

// Liste des origines autorisées (idéalement à externaliser en env var en prod)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5500,http://127.0.0.1:5500').split(',').map(origin => origin.trim()).filter(Boolean);

app.use(cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ⚠️ FIX SÉCURITÉ CRITIQUE : le dossier /uploads contient les CNIB des
// clients (pièces d'identité). Il ne doit JAMAIS être servi en statique
// sans authentification — cela contournait complètement les routes
// protégées /api/fiches/:id/cnib et /api/admin/documents/:id/*.
// Tous les fichiers sont désormais servis uniquement via ces routes
// authentifiées, qui vérifient le rôle et la propriété avant d'envoyer
// le fichier.
//
// app.use('/uploads', express.static(...)) — SUPPRIMÉ INTENTIONNELLEMENT

// ============================================================
//  ROUTES
// ============================================================
app.use('/api/auth',   authLimiter, authRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/fiches', ficheRoutes);
app.use('/api/admin',  adminRoutes);
app.use('/api/notifications', notifRoutes);

// Gestion explicite des erreurs Multer (fichiers multipart).
app.use((err, req, res, next) => {
    if (err && err.name === 'MulterError') {
        return res.status(400).json({
            success: false,
            message: err.code === 'LIMIT_FILE_SIZE'
                ? 'Le fichier dépasse la taille maximale autorisée.'
                : `Erreur de fichier : ${err.message}`,
        });
    }
    if (err && err.message === 'Seuls les fichiers PDF sont acceptés.') {
        return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
});
app.use('/api/push', require('./routes/push'));

// ============================================================
//  Health check
// ============================================================
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'SafeStay API opérationnelle',
        timestamp: new Date().toISOString(),
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    });
});

// ============================================================
//  404 handler
// ============================================================
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route introuvable : ${req.originalUrl}` });
});

// ============================================================
//  Error handler global
// ============================================================
app.use((err, req, res, next) => {
    console.error('❌ Erreur non gérée :', err);

    // Multer : fichier trop grand
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: `Fichier trop volumineux (max ${process.env.MAX_FILE_SIZE_MB || 5} MB).` });
    }
    // Multer : mauvais type
    if (err.message === 'Seuls les fichiers PDF sont acceptés.') {
        return res.status(400).json({ success: false, message: err.message });
    }
    // Mongoose : doublon unique
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(400).json({ success: false, message: `Ce ${field} est déjà utilisé.` });
    }

    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Erreur serveur interne.',
    });
});

// ============================================================
//  Création automatique du SuperAdmin au démarrage
// ============================================================
const createSuperAdmin = async () => {
    try {
        const exists = await User.findOne({ role: 'superadmin' });
        if (exists) return;

        // ⚠️ FIX SÉCURITÉ : plus de mot de passe par défaut en dur dans le
        // code source. Sans SUPERADMIN_PASSWORD défini, on refuse de créer
        // le compte plutôt que d'utiliser un mot de passe public/connu.
        if (!process.env.SUPERADMIN_EMAIL || !process.env.SUPERADMIN_PASSWORD) {
            console.error('⚠️  SUPERADMIN_EMAIL et SUPERADMIN_PASSWORD doivent être définis dans .env pour créer le compte superadmin. Compte NON créé.');
            return;
        }

        await User.create({
            role:       'superadmin',
            nom:        'Admin',
            prenom:     'SafeStay',
            email:      process.env.SUPERADMIN_EMAIL,
            password:   process.env.SUPERADMIN_PASSWORD,
            isActive:   true,
            isVerified: true,
        });
        console.log('👑 SuperAdmin créé automatiquement.');
    } catch (err) {
        console.error('Erreur création superadmin :', err.message);
    }
};

// ============================================================
//  Démarrage du serveur
// ============================================================
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
    console.log(`\n🚀 SafeStay API démarrée sur le port ${PORT}`);
    console.log(`   Mode    : ${process.env.NODE_ENV || 'development'}`);
    console.log(`   MongoDB : ${process.env.MONGO_URI ? 'configuré' : 'non configuré'}`);
    await createSuperAdmin();
    console.log(`\n📋 Routes disponibles :`);
    console.log(`   POST   /api/auth/register/client`);
    console.log(`   POST   /api/auth/register/hotel`);
    console.log(`   POST   /api/auth/login`);
    console.log(`   GET    /api/auth/me`);
    console.log(`   POST   /api/auth/forgot-password`);
    console.log(`   GET    /api/auth/verify-reset-token`);
    console.log(`   POST   /api/auth/reset-password`);
    console.log(`   GET    /api/hotels              (liste hôtels approuvés)`);
    console.log(`   GET    /api/hotels/:id/chambres  (chambres disponibles)`);
    console.log(`   POST   /api/fiches              (soumettre fiche - client)`);
    console.log(`   GET    /api/fiches/mes-fiches   (fiches du client)`);
    console.log(`   GET    /api/fiches/hotel        (fiches de l'hôtel)`);
    console.log(`   PATCH  /api/fiches/:id/valider`);
    console.log(`   PATCH  /api/fiches/:id/refuser`);
    console.log(`   PATCH  /api/fiches/:id/transmettre-police`);
    console.log(`   GET    /api/admin/stats         (superadmin)`);
    console.log(`   GET    /api/admin/hotels        (superadmin)`);
    console.log(`   PATCH  /api/admin/hotels/:id/approuver`);
    console.log(`   PATCH  /api/admin/hotels/:id/rejeter`);
    console.log(`   PATCH  /api/admin/users/:id/toggle`);
    console.log(`   GET    /api/notifications`);
    console.log(`   GET    /api/notifications/unread-count`);
    console.log(`   PATCH  /api/notifications/:id/read`);
    console.log(`   GET    /api/health\n`);
});

// Gestion propre des erreurs non capturées
process.on('unhandledRejection', (err) => {
    console.error('❌ UnhandledRejection :', err.message);
    server.close(() => process.exit(1));
});

module.exports = app;