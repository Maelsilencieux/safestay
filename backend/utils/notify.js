const Notification = require('../models/Notification');
//  Helper centralisé pour créer une notification in-app
//  Non bloquant : les erreurs sont loguées mais ne cassent pas
//  le flux principal (validation, refus, etc.

async function notify({ user, type, title, message, fiche, link }) {
    try {
        await Notification.create({ user, type, title, message, fiche, link });
    } catch (err) {
        console.error('⚠️ Erreur création notification :', err.message);
    }
}



// utils/notify.js
const webpush       = require('web-push');
const Subscription  = require('../models/Subscription');

webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
    process.env.VAPID_SUBJECT,
);

// Envoyer une notification à un utilisateur précis (par son _id)
async function notifyUser(userId, payload) {
    const subs = await Subscription.find({ user: userId });

    const results = await Promise.allSettled(
        subs.map(s => webpush.sendNotification(s.subscription, JSON.stringify(payload)))
    );

    // Nettoyer les subscriptions expirées
    for (let i = 0; i < results.length; i++) {
        if (results[i].status === 'rejected') {
            const reason = results[i].reason;
            if (reason?.statusCode === 410 || reason?.statusCode === 404) {
                await Subscription.findByIdAndDelete(subs[i]._id);
            }
        }
    }
}

// Envoyer à tous les utilisateurs d'un rôle
async function notifyRole(role, payload) {
    const User = require('../models/User');
    const users = await User.find({ role });
    await Promise.allSettled(users.map(u => notifyUser(u._id, payload)));
}

// ─── Notifications métier ─────────────────────────────────────

async function notifyCompteActive(userId) {
    await notifyUser(userId, {
        title: '✅ Compte activé — SafeStay',
        body:  'Votre compte a été activé. Vous pouvez maintenant vous connecter.',
        icon:  '/icon.png',
        url:   '/Login.html',
    });
}

async function notifyNouvelleInscription(adminId, nomHotel) {
    await notifyUser(adminId, {
        title: '🏨 Nouvelle inscription hôtel',
        body:  `L'hôtel "${nomHotel}" vient de s'inscrire et attend validation.`,
        icon:  '/icon.png',
        url:   '/adminhot.html',
    });
}

async function notifyFicheRecue(hotelUserId, nomClient) {
    await notifyUser(hotelUserId, {
        title: '📋 Nouvelle fiche reçue',
        body:  `${nomClient} vient de soumettre une fiche d'enregistrement.`,
        icon:  '/icon.png',
        url:   '/client.html',
    });
}

async function notifyFicheValidee(clientId, reference) {
    await notifyUser(clientId, {
        title: '✅ Fiche validée',
        body:  `Votre fiche ${reference} a été validée par l'hôtel.`,
        icon:  '/icon.png',
        url:   '/form.html',
    });
}

async function notifyFicheRefusee(clientId, reference, motif) {
    await notifyUser(clientId, {
        title: '❌ Fiche refusée',
        body:  `Votre fiche ${reference} a été refusée. Motif : ${motif || 'Non conforme'}.`,
        icon:  '/icon.png',
        url:   '/form.html',
    });
}

async function notifyResetPassword(userId, resetUrl) {
    await notifyUser(userId, {
        title: '🔑 Réinitialisation mot de passe — SafeStay',
        body:  'Cliquez pour réinitialiser votre mot de passe. Lien valable 30 minutes.',
        icon:  '/icon.png',
        url:   resetUrl,   // ← redirige directement vers reset.html?token=...
    });
}


module.exports = {
    notify,
    notifyUser,
    notifyRole,
    notifyCompteActive,
    notifyNouvelleInscription,
    notifyFicheRecue,
    notifyFicheValidee,
    notifyFicheRefusee,
    notifyResetPassword,
};
