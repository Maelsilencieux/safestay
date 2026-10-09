// utils/pdfFiche.js
// ============================================================
//  Génère le PDF officiel d'une fiche d'identification et
//  d'hébergement (format A4, République du Burkina Faso).
//  Sauvegarde dans uploads/fiches/<reference>.pdf
//
//  npm install pdfkit --save
// ============================================================

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const UPLOAD_ROOT = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
const FICHES_DIR = path.join(UPLOAD_ROOT, 'fiches');

function ensureFichesDir() {
  if (!fs.existsSync(FICHES_DIR)) {
    fs.mkdirSync(FICHES_DIR, { recursive: true });
  }
}

function formatDateFr(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function dureeSejour(entree, sortie) {
  if (!entree || !sortie) return '—';
  const ms = new Date(sortie) - new Date(entree);
  const jours = Math.round(ms / (1000 * 60 * 60 * 24));
  if (jours <= 0) return '1 jour';
  return jours === 1 ? '1 jour' : `${jours} jours`;
}

/**
 * Génère la fiche officielle A4 et l'enregistre sur le disque.
 * @param {Object} fiche  - document Fiche (Mongoose)
 * @param {Object} [hotel] - document Hotel (Mongoose) pour l'en-tête
 * @returns {Promise<string>} nom du fichier généré (à stocker dans fiche.pdfFiche)
 */
function generateFichePdf(fiche, hotel) {
  const hotelInfo = hotel || fiche.hotel || {};

  return new Promise((resolve, reject) => {
    try {
      ensureFichesDir();

      const filename = `${fiche.reference || fiche._id}.pdf`;
      const filePath = path.join(FICHES_DIR, filename);

      const doc = new PDFDocument({ size: 'A4', margin: 45 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // ── En-tête officiel ──────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(11)
        .text('RÉPUBLIQUE DU BURKINA FASO', { align: 'center' });
      doc.font('Helvetica').fontSize(9)
        .text('Unité – Progrès – Justice', { align: 'center' });
      doc.moveDown(0.8);

      doc.font('Helvetica-Bold').fontSize(14)
        .text("FICHE D'IDENTIFICATION ET D'HÉBERGEMENT", { align: 'center' });
      doc.moveDown(0.4);

      // Nom de l'hôtel bien visible
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#1a365d')
        .text(`HÔTEL : ${(hotelInfo.nomHotel || '—').toUpperCase()}`, { align: 'center' });
      doc.fillColor('#000');
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(10)
        .text(`Référence : ${fiche.reference || '—'}`, { align: 'center' });
      doc.moveDown(1.2);

      // ── I. IDENTIFICATION DU CLIENT ──────────────────────────
      doc.font('Helvetica-Bold').fontSize(11).text('I. IDENTIFICATION DU CLIENT');
      doc.moveDown(0.4);
      doc.font('Helvetica').fontSize(10);
      doc.text(`Nom et prénom : ${fiche.nom || ''} ${fiche.prenom || ''}`);
      doc.text(`Nationalité : ${fiche.nationalite || '—'} ${fiche.flagEmoji || ''}`);
      doc.text(`Date de naissance : ${formatDateFr(fiche.dateNaissance)}`);
      doc.text(`Lieu de naissance : ${fiche.lieuNaissance || '—'}`);
      doc.text(`Type et numéro de pièce : ${fiche.typePiece || 'CNIB'} n° ${fiche.numeroPiece || '—'}`);
      doc.text(`Délivrée le : ${formatDateFr(fiche.delivreLe)} à ${fiche.delivreA || '—'}`);
      doc.text(`Profession : ${fiche.profession || '—'}`);
      doc.text(`Adresse : ${fiche.adresse || '—'}, ${fiche.ville || ''}${fiche.bp ? ` — BP ${fiche.bp}` : ''}`);
      doc.moveDown(0.9);

      // ── II. INFORMATIONS SUR LE SÉJOUR ───────────────────────
      doc.font('Helvetica-Bold').fontSize(11).text('II. INFORMATIONS SUR LE SÉJOUR');
      doc.moveDown(0.4);
      doc.font('Helvetica').fontSize(10);
      doc.text(`Numéro de chambre : ${fiche.chambreNumero || '—'}`);
      doc.text(`Date d'arrivée : ${formatDateFr(fiche.dateEntree)}`);
      doc.text(`Date de départ : ${formatDateFr(fiche.dateSortie)}`);
      doc.text(`Durée du séjour : ${dureeSejour(fiche.dateEntree, fiche.dateSortie)}`);
      doc.text(`Venant de : ${fiche.venantDe || '—'}  →  Allant à : ${fiche.allantA || '—'}`);
      doc.text(`Motif du séjour : ${fiche.motif || '—'}`);
      doc.text(`Transport : ${fiche.transport || '—'}${fiche.plaque ? ` (${fiche.plaque})` : ''}`);
      doc.text(`Mode de paiement : ${fiche.modePaiement || '—'}`);
      doc.moveDown(0.9);

      // ── III. INFORMATIONS DE L'ÉTABLISSEMENT ─────────────────
      doc.font('Helvetica-Bold').fontSize(11).text("III. INFORMATIONS DE L'ÉTABLISSEMENT");
      doc.moveDown(0.4);
      doc.font('Helvetica').fontSize(10);
      doc.text(`Nom complet de l'hôtel : ${hotelInfo.nomHotel || '—'}`);
      doc.text(`Ville : ${hotelInfo.ville || '—'}`);
      if (hotelInfo.adresse) doc.text(`Adresse : ${hotelInfo.adresse}`);
      if (hotelInfo.telephone) doc.text(`Téléphone : ${hotelInfo.telephone}`);
      doc.moveDown(1.2);

      // Zone signature / cachet
      doc.font('Helvetica-Bold').fontSize(10).text('Signature / Cachet de l\'établissement');
      doc.moveDown(2.2);
      doc.font('Helvetica').fontSize(9).fillColor('#555')
        .text('Zone réservée à l\'établissement', { align: 'left' });
      doc.fillColor('#000');
      doc.moveDown(1.5);

      // Date d'établissement
      doc.font('Helvetica').fontSize(9)
        .text(`Date d'établissement : ${formatDateFr(new Date())}`, { align: 'right' });
      doc.moveDown(0.4);
      doc.font('Helvetica').fontSize(8).fillColor('#888')
        .text(
          `Document généré automatiquement par SafeStay — Réf. ${fiche.reference || ''}`,
          { align: 'center' }
        );

      doc.end();

      stream.on('finish', () => resolve(filename));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateFichePdf };