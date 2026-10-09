const mongoose = require('mongoose');

// ============================================================
//  Modèle Fiche d'enregistrement hôtelière
//  Cycle de vie : pending → registered | refused → transmitted
// ============================================================

const FicheSchema = new mongoose.Schema({

  // --- Références ---
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true,
  },
  hotelUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // --- Identité du client ---
  nom:           { type: String, required: true, trim: true },
  prenom:        { type: String, required: true, trim: true },
  dateNaissance: { type: Date, required: true },
  lieuNaissance: { type: String, required: true, trim: true },
  nationalite:   { type: String, required: true, trim: true },
  flagEmoji:     { type: String, default: '🌍' },
  profession:    { type: String, trim: true },
  adresse:       { type: String, required: true, trim: true },
  ville:         { type: String, required: true, trim: true },
  bp:            { type: String, trim: true },

  // --- Voyage ---
  venantDe: { type: String, required: true, trim: true },
  allantA:  { type: String, required: true, trim: true },
  motif: {
    type: String,
    enum: ['Tourisme', 'Affaires', 'Conférence', 'Formation', 'Reportage', 'Médical', 'Famille', 'Transit', 'Autre'],
    required: true,
  },

  // --- Pièce d'identité ---
  numeroPiece: { type: String, required: true, trim: true },
  typePiece:   { type: String, enum: ['CNIB', 'Passeport', 'Autre'], default: 'CNIB' },
  delivreLe:   { type: Date, required: true },
  delivreA:    { type: String, required: true, trim: true },
  cnibFichier: { type: String }, // nom du fichier pièce d'identité sur le serveur

  // --- PDF fiche officielle généré ---
  pdfFiche: { type: String, default: null },

  // --- Suivi téléchargement / archivage ---
  downloadedAt: { type: Date },
  isArchived:   { type: Boolean, default: false },
  archivedAt:   { type: Date },

  // --- Séjour ---
  dateEntree:    { type: Date, required: true },
  dateSortie:    { type: Date, required: true },
  chambreNumero: { type: String, required: true, trim: true },
  transport:     { type: String, required: true, trim: true },
  plaque:        { type: String, trim: true },

  // --- Paiement ---
  modePaiement: {
    type: String,
    enum: ['cash', 'cheque', 'carte', 'voucher'],
    default: 'cash',
  },

  // --- Statut & Workflow ---
  statut: {
    type: String,
    enum: ['pending', 'registered', 'refused', 'transmitted'],
    default: 'pending',
    index: true,
  },
  refusMotif: { type: String, trim: true },

  // --- Traitement hôtel ---
  traitePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  traiteAt:  { type: Date },

  // --- Transmission police ---
  transmisAt:        { type: Date },
  transmisReference: { type: String },

  // --- Numéro de référence SafeStay ---
  reference: { type: String, unique: true },

}, { timestamps: true });

// ===== Génération automatique de la référence =====
FicheSchema.pre('save', async function (next) {
  if (this.isNew && !this.reference) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Fiche').countDocuments();
    this.reference = `SS-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// ===== Index texte pour recherche =====
FicheSchema.index({ nom: 'text', prenom: 'text', numeroPiece: 'text' });

// Index unique partiel anti-doublon
FicheSchema.index(
  { client: 1, hotel: 1, dateEntree: 1, dateSortie: 1 },
  {
    unique: true,
    partialFilterExpression: { statut: { $in: ['pending', 'registered', 'transmitted'] } },
    name: 'unique_active_fiche_per_stay',
  }
);

module.exports = mongoose.model('Fiche', FicheSchema);