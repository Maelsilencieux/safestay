const mongoose = require('mongoose');

//  Modèle Notification — notifications in-app (cloche)
//  Indépendant de l'email : visible dès connexion/rafraîchissement


const NotificationSchema = new mongoose.Schema({

    // Destinataire de la notification
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },

    // Type de notification
    type: {
        type: String,
        enum: [
            'fiche_registered',   // fiche validée par l'hôtel
            'fiche_refused',      // fiche refusée par l'hôtel
            'fiche_transmitted',  // fiche transmise à la police
            'hotel_approved',     // compte hôtel approuvé
            'hotel_rejected',     // compte hôtel rejeté
            'fiche_received',     // nouvelle fiche reçue (pour l'hôtel)
        ],
        required: true,
    },

    title:   { type: String, required: true },
    message: { type: String, required: true },

    // Référence optionnelle vers la fiche concernée
    fiche: { type: mongoose.Schema.Types.ObjectId, ref: 'Fiche' },

    // Lien vers lequel rediriger au clic (optionnel)
    link: { type: String },

    isRead: { type: Boolean, default: false, index: true },

}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
