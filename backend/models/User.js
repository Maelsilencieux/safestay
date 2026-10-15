const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ============================================================
//  Schéma utilisateur unifié
//  roles : 'client' | 'hotel' | 'superadmin'
// ============================================================
const UserSchema = new mongoose.Schema({

    // --- Commun ---
    role: {
        type: String,
        enum: ['client', 'hotel', 'superadmin'],
        required: true,
    },
    email: {
        type: String,
        required: [true, 'Email requis'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Email invalide'],
    },
    password: {
        type: String,
        required: [true, 'Mot de passe requis'],
        minlength: [8, 'Minimum 8 caractères'],
        select: false,   // jamais renvoyé par défaut
    },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false }, // email vérifié
    verifyToken: String,
    resetToken: String,
    resetTokenExpire: Date,

    // Date du dernier changement de mot de passe (invalide les anciens tokens JWT)
    passwordChangedAt: { type: Date, default: null },

        // --- Vérification de l'e-mail (code à 6 chiffres) ---
    // default: true  => les comptes existants et ceux créés par l'admin restent utilisables
    emailVerified:     { type: Boolean, default: true },
    emailCodeHash:     { type: String, select: false },
    emailCodeExpire:   { type: Date,   select: false },
    emailCodeAttempts: { type: Number, select: false, default: 0 },
    emailCodeSentAt:   { type: Date,   select: false },

    // ★ NOUVEAU : true quand le compte a un mot de passe provisoire
    // (hôtel créé par le superadmin). Remis à false dès que l'utilisateur le change.
    mustChangePassword: { type: Boolean, default: false },

    // --- Client uniquement ---
    nom:       { type: String, trim: true },
    prenom:    { type: String, trim: true },
    telephone: { type: String, trim: true },
    nationalite: {type: String, trim: true },
    dateNaissance: { type: Date},
    lieuNaissance: {type: String,trim: true },
    adresse: {type: String,trim: true },
    ville: {type: String,trim: true},

    // --- Hôtel uniquement ---
    nomHotel:    { type: String, trim: true },
    adresseHotel:{ type: String, trim: true },
    villeHotel:  { type: String, trim: true },
    rccm:        { type: String, trim: true },   // Registre du Commerce
    telephone:   { type: String, trim: true },
    // Validation par le superadmin
    hotelStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
    hotelRejectedReason: String,
    approvedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

}, { timestamps: true });

// ===== Hooks =====

// Hachage du mot de passe avant save
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Méthode : vérifier le mot de passe
UserSchema.methods.matchPassword = async function(plain) {
    return bcrypt.compare(plain, this.password);
};

// Méthode : retourner un objet safe (sans password)
UserSchema.methods.toSafe = function() {
    const obj = this.toObject();
    delete obj.password;
    delete obj.verifyToken;
    delete obj.resetToken;
    delete obj.resetTokenExpire;
    delete obj.passwordChangedAt;
    delete obj.emailCodeHash;
    delete obj.emailCodeExpire;
    delete obj.emailCodeAttempts;
    delete obj.emailCodeSentAt;
    return obj;
};

UserSchema.index(
    { rccm: 1 },
    { unique: true, partialFilterExpression: { rccm: { $type: 'string' } } }
);

module.exports = mongoose.model('User', UserSchema);