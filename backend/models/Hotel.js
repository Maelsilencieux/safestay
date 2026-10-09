const mongoose = require('mongoose');

// ============================================================
//  Modèle Hotel  (lié au User de role 'hotel')
//  Gère la liste des chambres mises à jour par l'admin réseau
// ============================================================

const ChambreSchema = new mongoose.Schema({
    numero:      { type: String, required: true, trim: true },
    type:        {
        type: String,
        enum: ['Simple', 'Double', 'Suite', 'Familiale', 'VIP', 'Autre'],
        default: 'Simple',
    },
    etage:       { type: Number, default: 0 },
    disponible:  { type: Boolean, default: true },
    prix:        { type: Number, default: 0 },   // XOF
    description: { type: String, trim: true },
}, { _id: true });

const HotelSchema = new mongoose.Schema({
    // Lien vers le compte utilisateur de l'hôtel
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },

    // Infos publiques
    nomHotel:      { type: String, required: true, trim: true },
    adresse:       { type: String, trim: true },
    ville:         { type: String, trim: true, default: 'Ouagadougou' },
    pays:          { type: String, trim: true, default: 'Burkina Faso' },
    telephone:     { type: String, trim: true },
    email:         { type: String, trim: true },
    etoiles:       { type: Number, min: 1, max: 5, default: 3 },
    logo:          { type: String },   // chemin fichier upload

    // Chambres (gérées par l'admin réseau de l'hôtel)
    chambres: [ChambreSchema],

    // Stats (mises à jour calculées)
    totalChambres:    { type: Number, default: 0 },
    chambresOccupees: { type: Number, default: 0 },

}, { timestamps: true });

// Recalcul automatique des totaux avant save
HotelSchema.pre('save', function(next) {
    this.totalChambres    = this.chambres.length;
    this.chambresOccupees = this.chambres.filter(c => !c.disponible).length;
    next();
});

module.exports = mongoose.model('Hotel', HotelSchema);
