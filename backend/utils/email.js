// utils/email.js
// ─────────────────────────────────────────────
//  Service d'envoi d'emails via Mailtrap SMTP
//  Toutes les fonctions sont async et non bloquantes
// ─────────────────────────────────────────────
const nodemailer = require('nodemailer');

// ── Transporteur Mailtrap ──────────────────────────────────
const transporter = nodemailer.createTransport({
    host:   process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
    port:   parseInt(process.env.MAILTRAP_PORT)  || 2525,
    auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
    },
    tls: { rejectUnauthorized: false },
});

// Vérification au démarrage du serveur
transporter.verify((err) => {
    if (err) {
        console.error('❌ Mailtrap SMTP non connecté :', err.message);
    } else {
        console.log('✅ Mailtrap SMTP prêt — emails sandbox activés');
    }
});

// ── Constantes visuelles ───────────────────────────────────
const FROM      = process.env.EMAIL_FROM || '"SafeStay" <no-reply@safestay.bf>';
const LOGO_URL  = 'https://i.imgur.com/placeholder-logo.png'; // remplacer par votre vrai logo
const SITE_URL  = process.env.CLIENT_URL || 'http://localhost:5500';

const NAVY  = '#1A2640';
const GOLD  = '#B8860B';
const GREEN = '#1A9E6A';
const RED   = '#D94F4F';

// ── Base HTML de l'email ───────────────────────────────────
function baseTemplate(contenu, pied) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SafeStay</title>
</head>
<body style="margin:0;padding:0;background:#F5F3EE;font-family:'Segoe UI',Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3EE;padding:32px 16px;">
    <tr><td align="center">

      <!-- Carte -->
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(26,38,64,0.10);">

        <!-- Header navy -->
        <tr>
          <td style="background:${NAVY};padding:28px 40px;text-align:center;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="text-align:center;">
                  <span style="font-size:28px;font-weight:900;color:#FFFFFF;letter-spacing:1px;
                               font-family:Georgia,'Times New Roman',serif;">
                    🛡️ SafeStay
                  </span>
                  <p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,0.55);
                             letter-spacing:2px;text-transform:uppercase;">
                    Digitalisation des fiches hôtelières
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Bande or -->
        <tr>
          <td style="background:${GOLD};height:4px;"></td>
        </tr>

        <!-- Contenu -->
        <tr>
          <td style="padding:40px 40px 24px;">
            ${contenu}
          </td>
        </tr>

        <!-- Pied de page -->
        <tr>
          <td style="background:#F5F3EE;padding:24px 40px;border-top:1px solid rgba(26,38,64,0.08);">
            <p style="margin:0;font-size:12px;color:#A8B3C4;text-align:center;line-height:1.6;">
              ${pied || 'Cet email a été envoyé automatiquement par SafeStay.<br>Si vous n\'êtes pas à l\'origine de cette action, ignorez ce message.'}
            </p>
            <p style="margin:10px 0 0;font-size:11px;color:#C4CDD8;text-align:center;">
              © ${new Date().getFullYear()} SafeStay · i-technologie · Ouagadougou, Burkina Faso
            </p>
          </td>
        </tr>

      </table>

    </td></tr>
  </table>

</body>
</html>`;
}

// ── Bloc bouton réutilisable ────────────────────────────────
function btnHtml(href, label, couleur) {
    couleur = couleur || GOLD;
    return `<table cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
      <tr>
        <td style="background:${couleur};border-radius:10px;">
          <a href="${href}" target="_blank"
             style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;
                    color:#FFFFFF;text-decoration:none;letter-spacing:0.3px;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

// ── Ligne info réutilisable ─────────────────────────────────
function infoLigne(label, valeur) {
    return `<tr>
      <td style="padding:9px 0;border-bottom:1px solid rgba(26,38,64,0.06);">
        <span style="font-size:12px;color:#6B7A94;text-transform:uppercase;letter-spacing:0.4px;">${label}</span><br>
        <strong style="font-size:14px;color:${NAVY};">${valeur}</strong>
      </td>
    </tr>`;
}

// ════════════════════════════════════════════════════════════
//  1. BIENVENUE CLIENT — inscription réussie
// ════════════════════════════════════════════════════════════
async function sendBienvenueClient(user) {
    const prenom = user.prenom || user.nom || 'Client';
    const html = baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:${NAVY};font-family:Georgia,serif;">
        Bienvenue sur SafeStay, ${prenom} !
      </h1>
      <p style="margin:0 0 24px;font-size:14px;color:#6B7A94;line-height:1.7;">
        Votre compte client a été créé avec succès. Vous pouvez maintenant soumettre vos fiches d'enregistrement hôtelier en ligne.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#F5F3EE;border-radius:10px;padding:20px;margin-bottom:24px;">
        <tbody>
          ${infoLigne('Nom complet', prenom + ' ' + (user.nom || ''))}
          ${infoLigne('Adresse email', user.email)}
          ${infoLigne('Rôle', 'Client SafeStay')}
          ${infoLigne('Compte créé le', new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' }))}
        </tbody>
      </table>

      <p style="font-size:13px;color:#6B7A94;line-height:1.6;margin-bottom:4px;">
        Connectez-vous pour remplir votre fiche avant votre arrivée à l'hôtel.
      </p>

      ${btnHtml(SITE_URL + '/Login.html', '🚀 Accéder à mon compte', NAVY)}
    `);

    await transporter.sendMail({
        from:    FROM,
        to:      user.email,
        subject: '🎉 Bienvenue sur SafeStay — Votre compte est prêt',
        html,
        text:    `Bonjour ${prenom}, votre compte SafeStay a été créé avec succès. Connectez-vous sur ${SITE_URL}/Login.html`,
    });
}

// ════════════════════════════════════════════════════════════
//  2. DEMANDE REÇUE — hôtel en attente de validation
// ════════════════════════════════════════════════════════════
async function sendHotelPending(user) {
    const nom = user.nomHotel || user.nom || 'Votre établissement';
    const html = baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${NAVY};font-family:Georgia,serif;">
        Demande d'inscription reçue
      </h1>
      <p style="margin:0 0 24px;font-size:14px;color:#6B7A94;line-height:1.7;">
        Nous avons bien reçu la demande d'inscription de <strong>${nom}</strong>. Notre équipe va vérifier votre dossier sous <strong>24 à 48 heures</strong>.
      </p>

      <!-- Badge statut -->
      <div style="text-align:center;margin-bottom:24px;">
        <span style="display:inline-block;background:rgba(200,134,11,0.10);border:1px solid #C8860B;
                     color:#C8860B;font-size:13px;font-weight:700;padding:8px 20px;border-radius:20px;">
          ⏳ Dossier en cours de vérification
        </span>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#F5F3EE;border-radius:10px;padding:20px;margin-bottom:24px;">
        <tbody>
          ${infoLigne('Établissement', nom)}
          ${infoLigne('Email de contact', user.email)}
          ${infoLigne('RCCM fourni', user.rccm || '—')}
          ${infoLigne('Ville', user.villeHotel || user.ville || '—')}
          ${infoLigne('Date de demande', new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' }))}
        </tbody>
      </table>

      <p style="font-size:13px;color:#6B7A94;line-height:1.6;">
        Vous recevrez un email de confirmation dès que votre dossier aura été examiné. En cas de question, contactez notre support.
      </p>
    `, 'Cet email confirme la réception de votre dossier. Aucune action n\'est requise de votre part.');

    await transporter.sendMail({
        from:    FROM,
        to:      user.email,
        subject: '📋 SafeStay — Demande d\'inscription reçue, vérification en cours',
        html,
        text: `Votre demande d'inscription pour ${nom} a bien été reçue. Nous la traitons sous 24-48h.`,
    });
}

// ════════════════════════════════════════════════════════════
//  3. COMPTE HÔTEL ACTIVÉ — superadmin a approuvé
// ════════════════════════════════════════════════════════════
async function sendHotelApprouve(user) {
    const nom = user.nomHotel || user.nom || 'Votre établissement';
    const html = baseTemplate(`
      <!-- Icône succès -->
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:64px;height:64px;border-radius:50%;background:rgba(26,158,106,0.10);
                    border:2px solid ${GREEN};display:inline-flex;align-items:center;justify-content:center;
                    margin:0 auto;">
          <span style="font-size:30px;">✅</span>
        </div>
      </div>

      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${NAVY};font-family:Georgia,serif;text-align:center;">
        Compte approuvé !
      </h1>
      <p style="margin:0 0 24px;font-size:14px;color:#6B7A94;line-height:1.7;text-align:center;">
        Félicitations ! L'établissement <strong>${nom}</strong> a été validé par l'équipe SafeStay. Votre espace hôtelier est maintenant actif.
      </p>

      <!-- Badge actif -->
      <div style="text-align:center;margin-bottom:24px;">
        <span style="display:inline-block;background:rgba(26,158,106,0.10);border:1px solid ${GREEN};
                     color:${GREEN};font-size:13px;font-weight:700;padding:8px 20px;border-radius:20px;">
          ✅ Compte actif — Accès complet
        </span>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#F5F3EE;border-radius:10px;padding:20px;margin-bottom:20px;">
        <tbody>
          ${infoLigne('Établissement', nom)}
          ${infoLigne('Email', user.email)}
          ${infoLigne('Statut', 'Approuvé ✅')}
          ${infoLigne('Date d\'activation', new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' }))}
        </tbody>
      </table>

      <p style="font-size:13px;color:#6B7A94;line-height:1.6;margin-bottom:4px;">
        Vous pouvez maintenant vous connecter pour gérer vos fiches clients, valider les enregistrements et transmettre les données aux autorités de police.
      </p>

      ${btnHtml(SITE_URL + '/Login.html', '🏨 Accéder à mon tableau de bord', GREEN)}
    `, 'Votre compte hôtel SafeStay est maintenant actif et pleinement opérationnel.');

    await transporter.sendMail({
        from:    FROM,
        to:      user.email,
        subject: '✅ SafeStay — Votre compte hôtel est activé !',
        html,
        text: `Félicitations ! Le compte de ${nom} a été approuvé. Connectez-vous sur ${SITE_URL}/Login.html`,
    });
}

// ════════════════════════════════════════════════════════════
//  4. COMPTE HÔTEL REFUSÉ
// ════════════════════════════════════════════════════════════
async function sendHotelRefuse(user, motif) {
    const nom = user.nomHotel || user.nom || 'Votre établissement';
    const html = baseTemplate(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:64px;height:64px;border-radius:50%;background:rgba(217,79,79,0.10);
                    border:2px solid ${RED};display:inline-flex;align-items:center;justify-content:center;margin:0 auto;">
          <span style="font-size:30px;">❌</span>
        </div>
      </div>

      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${NAVY};font-family:Georgia,serif;text-align:center;">
        Demande non retenue
      </h1>
      <p style="margin:0 0 24px;font-size:14px;color:#6B7A94;line-height:1.7;text-align:center;">
        Après examen, la demande d'inscription de <strong>${nom}</strong> n'a pas pu être approuvée.
      </p>

      <!-- Motif -->
      <div style="background:rgba(217,79,79,0.05);border-left:4px solid ${RED};border-radius:6px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:12px;color:#6B7A94;text-transform:uppercase;letter-spacing:0.4px;">Motif du refus</p>
        <p style="margin:6px 0 0;font-size:14px;color:${RED};font-weight:600;">
          ${motif || 'Documents non conformes ou incomplets'}
        </p>
      </div>

      <p style="font-size:13px;color:#6B7A94;line-height:1.6;">
        Si vous pensez qu'il s'agit d'une erreur ou si vous souhaitez soumettre un dossier corrigé, contactez notre support ou refaites une demande d'inscription avec les documents conformes.
      </p>
    `, 'Pour toute question concernant ce refus, contactez le support SafeStay.');

    await transporter.sendMail({
        from:    FROM,
        to:      user.email,
        subject: '❌ SafeStay — Demande d\'inscription non retenue',
        html,
        text: `La demande d'inscription de ${nom} n'a pas été approuvée. Motif : ${motif || 'Documents non conformes'}.`,
    });
}

// ════════════════════════════════════════════════════════════
//  5. MOT DE PASSE OUBLIÉ — lien de réinitialisation
// ════════════════════════════════════════════════════════════
async function sendResetPassword(user, resetUrl) {
    const prenom = user.prenom || user.nom || user.nomHotel || 'Utilisateur';
    const expiration = '30 minutes';
    const html = baseTemplate(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:64px;height:64px;border-radius:50%;background:rgba(184,134,11,0.10);
                    border:2px solid ${GOLD};display:inline-flex;align-items:center;justify-content:center;margin:0 auto;">
          <span style="font-size:30px;">🔑</span>
        </div>
      </div>

      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${NAVY};font-family:Georgia,serif;text-align:center;">
        Réinitialisation du mot de passe
      </h1>
      <p style="margin:0 0 24px;font-size:14px;color:#6B7A94;line-height:1.7;text-align:center;">
        Bonjour <strong>${prenom}</strong>, vous avez demandé à réinitialiser votre mot de passe SafeStay.
      </p>

      <!-- Avertissement expiration -->
      <div style="background:rgba(184,134,11,0.06);border:1px solid rgba(184,134,11,0.25);
                  border-radius:8px;padding:14px 18px;margin-bottom:24px;text-align:center;">
        <p style="margin:0;font-size:13px;color:#C8860B;font-weight:600;">
          ⏱ Ce lien est valable pendant <strong>${expiration}</strong> seulement.
        </p>
      </div>

      <p style="font-size:13px;color:#6B7A94;line-height:1.6;margin-bottom:4px;text-align:center;">
        Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
      </p>

      ${btnHtml(resetUrl, '🔐 Réinitialiser mon mot de passe', NAVY)}

      <!-- Lien alternatif -->
      <div style="margin-top:24px;padding:14px;background:#F5F3EE;border-radius:8px;">
        <p style="margin:0;font-size:11.5px;color:#A8B3C4;text-align:center;word-break:break-all;">
          Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
          <a href="${resetUrl}" style="color:${GOLD};text-decoration:none;">${resetUrl}</a>
        </p>
      </div>
    `, 'Si vous n\'avez pas demandé de réinitialisation, ignorez ce message. Votre mot de passe reste inchangé.');

    await transporter.sendMail({
        from:    FROM,
        to:      user.email,
        subject: '🔑 SafeStay — Réinitialisation de votre mot de passe',
        html,
        text: `Bonjour ${prenom}, cliquez sur ce lien pour réinitialiser votre mot de passe (valable 30 min) : ${resetUrl}`,
    });
}

// ════════════════════════════════════════════════════════════
//  6. MOT DE PASSE MODIFIÉ — confirmation
// ════════════════════════════════════════════════════════════
async function sendPasswordChanged(user) {
    const prenom = user.prenom || user.nom || user.nomHotel || 'Utilisateur';
    const html = baseTemplate(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:64px;height:64px;border-radius:50%;background:rgba(26,158,106,0.10);
                    border:2px solid ${GREEN};display:inline-flex;align-items:center;justify-content:center;margin:0 auto;">
          <span style="font-size:30px;">🔒</span>
        </div>
      </div>

      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${NAVY};font-family:Georgia,serif;text-align:center;">
        Mot de passe modifié
      </h1>
      <p style="margin:0 0 24px;font-size:14px;color:#6B7A94;line-height:1.7;text-align:center;">
        Bonjour <strong>${prenom}</strong>, votre mot de passe SafeStay a été modifié avec succès.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#F5F3EE;border-radius:10px;padding:20px;margin-bottom:24px;">
        <tbody>
          ${infoLigne('Email du compte', user.email)}
          ${infoLigne('Modifié le', new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }))}
        </tbody>
      </table>

      <!-- Alerte sécurité -->
      <div style="background:rgba(217,79,79,0.05);border:1px solid rgba(217,79,79,0.20);
                  border-radius:8px;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:${RED};">
          🚨 <strong>Ce n'est pas vous ?</strong> Contactez immédiatement le support SafeStay et changez votre mot de passe.
        </p>
      </div>

      ${btnHtml(SITE_URL + '/Login.html', '🔑 Se connecter', GREEN)}
    `);

    await transporter.sendMail({
        from:    FROM,
        to:      user.email,
        subject: '🔒 SafeStay — Votre mot de passe a été modifié',
        html,
        text: `Bonjour ${prenom}, votre mot de passe SafeStay a été modifié. Si ce n'est pas vous, contactez le support immédiatement.`,
    });
}

// ════════════════════════════════════════════════════════════
//  7. FICHE REÇUE — confirmation au client
// ════════════════════════════════════════════════════════════
async function sendFicheReceived(emailDest, fiche) {
    const html = baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${NAVY};font-family:Georgia,serif;">
        Fiche reçue ✅
      </h1>
      <p style="margin:0 0 24px;font-size:14px;color:#6B7A94;line-height:1.7;">
        Votre fiche d'enregistrement a bien été soumise et est en attente de traitement par l'hôtel.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#F5F3EE;border-radius:10px;padding:20px;margin-bottom:24px;">
        <tbody>
          ${infoLigne('Référence', fiche.reference || '—')}
          ${infoLigne('Nom', (fiche.prenom || '') + ' ' + (fiche.nom || ''))}
          ${infoLigne('Chambre', fiche.chambreNumero || '—')}
          ${infoLigne('Statut', '⏳ En attente de validation')}
        </tbody>
      </table>
    `);

    await transporter.sendMail({
        from:    FROM,
        to:      emailDest,
        subject: '📋 SafeStay — Fiche reçue (' + (fiche.reference || '') + ')',
        html,
        text: `Votre fiche ${fiche.reference} a bien été reçue et est en cours de traitement.`,
    });
}

// ════════════════════════════════════════════════════════════
//  8. FICHE VALIDÉE
// ════════════════════════════════════════════════════════════
async function sendFicheValidated(emailDest, fiche) {
    const html = baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${GREEN};font-family:Georgia,serif;">
        Fiche validée ✅
      </h1>
      <p style="margin:0 0 24px;font-size:14px;color:#6B7A94;line-height:1.7;">
        Votre fiche <strong>${fiche.reference}</strong> a été validée par l'hôtel.
      </p>

      <div style="text-align:center;margin-bottom:20px;">
        <span style="background:rgba(26,158,106,0.10);border:1px solid ${GREEN};
                     color:${GREEN};font-size:13px;font-weight:700;padding:8px 20px;border-radius:20px;">
          ✅ Enregistrée
        </span>
      </div>
    `);

    await transporter.sendMail({
        from: FROM, to: emailDest,
        subject: '✅ SafeStay — Fiche validée (' + (fiche.reference || '') + ')',
        html,
        text: `Votre fiche ${fiche.reference} a été validée.`,
    });
}

// ════════════════════════════════════════════════════════════
//  9. FICHE REFUSÉE
// ════════════════════════════════════════════════════════════
async function sendFicheRefused(emailDest, fiche) {
    const html = baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${RED};font-family:Georgia,serif;">
        Fiche refusée ❌
      </h1>
      <p style="margin:0 0 24px;font-size:14px;color:#6B7A94;line-height:1.7;">
        Votre fiche <strong>${fiche.reference}</strong> a été refusée.
      </p>

      <div style="background:rgba(217,79,79,0.05);border-left:4px solid ${RED};border-radius:6px;
                  padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:12px;color:#6B7A94;text-transform:uppercase;letter-spacing:0.4px;">Motif</p>
        <p style="margin:6px 0 0;font-size:14px;color:${RED};font-weight:600;">
          ${fiche.refusMotif || 'Informations non conformes'}
        </p>
      </div>
    `);

    await transporter.sendMail({
        from: FROM, to: emailDest,
        subject: '❌ SafeStay — Fiche refusée (' + (fiche.reference || '') + ')',
        html,
        text: `Votre fiche ${fiche.reference} a été refusée. Motif : ${fiche.refusMotif || 'Informations non conformes'}.`,
    });
}

module.exports = {
    sendBienvenueClient,
    sendHotelPending,
    sendHotelApprouve,
    sendHotelRefuse,
    sendResetPassword,
    sendPasswordChanged,
    sendFicheReceived,
    sendFicheValidated,
    sendFicheRefused,

    // Alias compatibilité (anciens noms)
    sendWelcomeClient:  sendBienvenueClient,
    sendWelcome:        sendBienvenueClient,
    sendPasswordReset:  sendResetPassword,
    sendPasswordChanged: sendPasswordChanged,
    sendFicheReceived:  sendFicheReceived,
    sendFicheValidated: sendFicheValidated,
    sendFicheRefused:   sendFicheRefused,
};