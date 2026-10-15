require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose  = require('mongoose');

const connectDB = require('./config/db');
const User      = require('./models/User');
const { noSqlGuard } = require('./middleware/sanitize');
const { startLiberationJob } = require('./jobs/libererChambres');

const isProd = process.env.NODE_ENV === 'production';

// ===== Vérification de la configuration =====
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    const msg = '⚠️  JWT_SECRET absent ou trop court (32 caractères minimum).';
    if (isProd) { console.error(msg); process.exit(1); }
    console.warn(msg);
}

// ===== Routes =====
const authRoutes  = require('./routes/auth');
const hotelRoutes = require('./routes/hotels');
const ficheRoutes = require('./routes/fiches');
const adminRoutes = require('./routes/admin');
const notifRoutes = require('./routes/notifications');
const pushRoutes  = require('./routes/push');

// ===== Init =====
const app = express();
connectDB();

// Derrière un proxy (Nginx, Render...) : pour que req.ip et le rate limiting voient la vraie IP
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));

// ============================================================
//  SÉCURITÉ
// ============================================================
app.use(helmet({ referrerPolicy: { policy: 'no-referrer' } }));

const limiter = (options) => rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
});

// Limite globale
app.use(limiter({
    windowMs: 15 * 60 * 1000,
    max: 600,
    message: { success: false, message: 'Trop de requêtes. Réessayez dans quelques minutes.' },
}));

// Limites strictes ciblées (avant le montage des routes auth)
app.use('/api/auth/login', limiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    skipSuccessfulRequests: true, // seules les tentatives échouées comptent
    message: { success: false, message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
}));
const resetLimiter = limiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'Trop de demandes. Réessayez dans une heure.' },
});
app.use('/api/auth/forgot-password', resetLimiter);
app.use('/api/auth/reset-password',  resetLimiter);
app.use('/api/auth/register', limiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { success: false, message: "Trop d'inscriptions depuis cette adresse. Réessayez plus tard." },
}));

app.use('/api/auth/verify-email', limiter({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: { success: false, message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
}));
app.use('/api/auth/resend-code', limiter({
    windowMs: 60 * 60 * 1000,
    max: 8,
    message: { success: false, message: 'Trop de demandes de code. Réessayez plus tard.' },
}));

// ============================================================
//  CORS : uniquement les origines déclarées
// ============================================================
const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
    'http://localhost:3000,http://127.0.0.1:3000')
    .split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
    // Pas d'en-tête Origin (curl, serveur à serveur, même origine) : autorisé
    origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ============================================================
//  PARSEURS + PROTECTION NoSQL
// ============================================================
// Les fichiers passent par multer : 100 ko suffisent pour le JSON
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(noSqlGuard);

// Le dossier /uploads n'est JAMAIS servi en statique : les fichiers ne sortent
// que par les routes authentifiées (/api/fiches/:id/cnib, /api/admin/documents/...).

// ============================================================
//  ROUTES
// ============================================================
app.use('/api/auth',          authRoutes);
app.use('/api/hotels',        hotelRoutes);
app.use('/api/fiches',        ficheRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/notifications', notifRoutes);
app.use('/api/push',          pushRoutes);

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'SafeStay API opérationnelle',
        timestamp: new Date().toISOString(),
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    });
});

// ============================================================
//  404
// ============================================================
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route introuvable : ${req.originalUrl}` });
});

// ============================================================
//  Gestionnaire d'erreurs global (unique, placé en dernier)
// ============================================================
app.use((err, req, res, next) => {
    // Multer (fichiers)
    if (err && err.name === 'MulterError') {
        return res.status(400).json({
            success: false,
            message: err.code === 'LIMIT_FILE_SIZE'
                ? `Fichier trop volumineux (max ${process.env.MAX_FILE_SIZE_MB || 5} Mo).`
                : `Erreur de fichier : ${err.message}`,
        });
    }
    if (err && err.message === 'Seuls les fichiers PDF sont acceptés.') {
        return res.status(400).json({ success: false, message: err.message });
    }
    // Corps de requête
    if (err && err.type === 'entity.too.large') {
        return res.status(413).json({ success: false, message: 'Requête trop volumineuse.' });
    }
    if (err && err.type === 'entity.parse.failed') {
        return res.status(400).json({ success: false, message: 'JSON invalide.' });
    }
    // Doublon unique MongoDB
    if (err && err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0] || 'champ';
        return res.status(400).json({ success: false, message: `Ce ${field} est déjà utilisé.` });
    }

    console.error('❌ Erreur non gérée :', err);
    const status = err.statusCode || err.status || 500;
    res.status(status).json({
        success: false,
        message: status >= 500 && isProd
            ? 'Erreur serveur interne.'
            : (err.message || 'Erreur serveur interne.'),
    });
});

// ============================================================
//  Création automatique du SuperAdmin au démarrage
// ============================================================
const createSuperAdmin = async () => {
    try {
        const exists = await User.findOne({ role: 'superadmin' });
        if (exists) return;

        if (!process.env.SUPERADMIN_EMAIL || !process.env.SUPERADMIN_PASSWORD) {
            console.error('⚠️  SUPERADMIN_EMAIL et SUPERADMIN_PASSWORD doivent être définis dans .env. Compte NON créé.');
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
//  Démarrage
// ============================================================
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
    console.log(`\n🚀 SafeStay API démarrée sur le port ${PORT}`);
    console.log(`   Mode    : ${process.env.NODE_ENV || 'development'}`);
    console.log(`   MongoDB : ${process.env.MONGO_URI ? 'configuré' : 'non configuré'}`);
    console.log(`   CORS    : ${allowedOrigins.join(', ')}`);
    
    await createSuperAdmin();
    startLiberationJob();
});

process.on('unhandledRejection', (err) => {
    console.error('❌ UnhandledRejection :', err && err.message ? err.message : err);
    server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
    console.error('❌ UncaughtException :', err);
    process.exit(1);
});

module.exports = app;