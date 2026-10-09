const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');

const Fiche = require('../models/Fiche');
const Hotel = require('../models/Hotel');
const upload = require('../middleware/upload');
const { protect, authorize, hotelApproved } = require('../middleware/auth');
const emailSvc = require('../utils/email');
const { notify } = require('../utils/notify');
const { generateFichePdf } = require('../utils/pdfFiche');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  next();
};

const FLAGS = {
  'Burkinabé': '🇧🇫', 'Ivoirien': '🇨🇮', 'Malien': '🇲🇱', 'Nigérien': '🇳🇪',
  'Sénégalais': '🇸🇳', 'Guinéen': '🇬🇳', 'Togolais': '🇹🇬', 'Béninois': '🇧🇯',
  'Ghanéen': '🇬🇭', 'Nigérian': '🇳🇬', 'Américain': '🇺🇸', 'Français': '🇫🇷', 'Autre': '🌍',
};

const UPLOAD_ROOT = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');

// ============================================================
//  POST /api/fiches
// ============================================================
router.post('/',
  protect,
  authorize('client'),
  upload.single('cnib'),
  [
    body('nom').notEmpty().withMessage('Nom requis'),
    body('prenom').notEmpty().withMessage('Prénom requis'),
    body('dateNaissance').isDate().withMessage('Date de naissance invalide'),
    body('lieuNaissance').notEmpty(),
    body('nationalite').notEmpty(),
    body('adresse').notEmpty(),
    body('ville').notEmpty(),
    body('venantDe').notEmpty(),
    body('allantA').notEmpty(),
    body('motif').notEmpty(),
    body('numeroPiece').notEmpty().withMessage('N° de pièce requis'),
    body('delivreLe').isDate(),
    body('delivreA').notEmpty(),
    body('hotelId').notEmpty().withMessage('Hôtel requis'),
    body('chambreNumero').notEmpty().withMessage('Chambre requise'),
    body('dateEntree').isDate(),
    body('dateSortie').isDate(),
    body('transport').notEmpty(),
  ],
  validate,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Fichier CNIB/Passeport PDF requis.' });
      }

      const hotel = await Hotel.findById(req.body.hotelId);
      if (!hotel) return res.status(404).json({ success: false, message: 'Hôtel introuvable.' });

      const entree = new Date(req.body.dateEntree);
      const sortie = new Date(req.body.dateSortie);
      if (sortie <= entree) {
        return res.status(400).json({ success: false, message: 'La date de sortie doit être après la date d\'entrée.' });
      }

      const doublon = await Fiche.findOne({
        client: req.user._id,
        hotel: hotel._id,
        dateEntree: entree,
        dateSortie: sortie,
        statut: { $in: ['pending', 'registered', 'transmitted'] },
      });

      if (doublon) {
        return res.status(409).json({
          success: false,
          message: `Vous avez déjà soumis une fiche (réf. ${doublon.reference}) pour cet hôtel et ces mêmes dates de séjour. Statut actuel : ${doublon.statut}.`,
          existingFiche: {
            reference: doublon.reference,
            statut: doublon.statut,
            createdAt: doublon.createdAt,
          },
        });
      }

      const {
        nom, prenom, dateNaissance, lieuNaissance, nationalite,
        profession, adresse, ville, bp,
        venantDe, allantA, motif,
        numeroPiece, typePiece, delivreLe, delivreA,
        chambreNumero, transport, plaque, modePaiement,
      } = req.body;

      const fiche = await Fiche.create({
        client: req.user._id,
        hotel: hotel._id,
        hotelUser: hotel.user,
        nom, prenom,
        dateNaissance, lieuNaissance,
        nationalite,
        flagEmoji: FLAGS[nationalite] || '🌍',
        profession: profession || '',
        adresse, ville, bp: bp || '',
        venantDe, allantA, motif,
        numeroPiece,
        typePiece: typePiece || 'CNIB',
        delivreLe,
        delivreA,
        cnibFichier: req.file.filename,
        dateEntree: entree,
        dateSortie: sortie,
        chambreNumero,
        transport,
        plaque: plaque || '',
        modePaiement: modePaiement || 'cash',
        statut: 'pending',
      });

      const chambre = hotel.chambres.find(c => c.numero === chambreNumero);
      if (chambre) {
        chambre.disponible = false;
        await hotel.save();
      }

      emailSvc.sendFicheReceived(req.user.email, fiche).catch(console.error);

      notify({
        user: hotel.user,
        type: 'fiche_received',
        title: '📋 Nouvelle fiche reçue',
        message: `${prenom} ${nom} a soumis une fiche pour la chambre ${chambreNumero}.`,
        fiche: fiche._id,
        link: 'client.html',
      }).catch(console.error);

      res.status(201).json({
        success: true,
        message: 'Fiche soumise avec succès.',
        fiche: {
          _id: fiche._id,
          reference: fiche.reference,
          statut: fiche.statut,
          createdAt: fiche.createdAt,
        },
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Une fiche identique est déjà en cours de traitement pour cet hôtel et ces dates. Veuillez patienter.',
        });
      }
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ============================================================
//  GET /api/fiches/mes-fiches
// ============================================================
router.get('/mes-fiches', protect, authorize('client'), async (req, res) => {
  try {
    const fiches = await Fiche.find({ client: req.user._id })
      .populate('hotel', 'nomHotel ville')
      .sort('-createdAt')
      .select('-cnibFichier');

    res.json({ success: true, count: fiches.length, fiches });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
//  GET /api/fiches/hotel
// ============================================================
router.get('/hotel', protect, authorize('hotel'), hotelApproved, async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ user: req.user._id });
    if (!hotel) return res.status(404).json({ success: false, message: 'Hôtel introuvable.' });

    const { statut, page = 1, limit = 20, q } = req.query;
    const filter = { hotel: hotel._id };
    if (statut) {
      filter.statut = statut;
    } else {
      filter.statut = { $in: ['pending', 'registered'] };
    }
    if (q) filter.$text = { $search: q };

    const fiches = await Fiche.find(filter)
      .populate('client', 'nom prenom email')
      .populate('hotel', 'nomHotel ville')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Fiche.countDocuments(filter);

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      fiches,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
//  GET /api/fiches/hotel/documents
// ============================================================
router.get('/hotel/documents', protect, authorize('hotel'), hotelApproved, async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ user: req.user._id });
    if (!hotel) {
      return res.status(404).json({ success: false, message: 'Hôtel introuvable.' });
    }

    const { page = 1, limit = 20 } = req.query;

    const filter = {
      hotel: hotel._id,
      statut: { $in: ['registered', 'refused', 'transmitted'] },
      $or: [
        { cnibFichier: { $ne: null } },
        { pdfFiche: { $ne: null } },
      ],
    };

    const fiches = await Fiche.find(filter)
      .populate('client', 'email nom prenom')
      .populate('hotel', 'nomHotel ville')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Fiche.countDocuments(filter);

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      fiches,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
//  GET /api/fiches/hotel/stats
// ============================================================
router.get('/hotel/stats', protect, authorize('hotel'), hotelApproved, async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ user: req.user._id });
    if (!hotel) return res.status(404).json({ success: false, message: 'Hôtel introuvable.' });

    const [pending, registered, refused, transmitted, totalClients] = await Promise.all([
      Fiche.countDocuments({ hotel: hotel._id, statut: 'pending' }),
      Fiche.countDocuments({ hotel: hotel._id, statut: 'registered' }),
      Fiche.countDocuments({ hotel: hotel._id, statut: 'refused' }),
      Fiche.countDocuments({ hotel: hotel._id, statut: 'transmitted' }),
      Fiche.countDocuments({ hotel: hotel._id }),
    ]);

    res.json({
      success: true,
      stats: {
        totalClients,
        pending,
        registered,
        refused,
        transmitted,
        chambresOccupees: hotel.chambresOccupees,
        totalChambres: hotel.totalChambres,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
//  GET /api/fiches/:id
// ============================================================
router.get('/:id', protect, async (req, res) => {
  try {
    const fiche = await Fiche.findById(req.params.id)
      .populate('client', 'nom prenom email')
      .populate('hotel', 'nomHotel ville adresse');

    if (!fiche) return res.status(404).json({ success: false, message: 'Fiche introuvable.' });

    const isOwner = fiche.client._id.toString() === req.user._id.toString();
    const isHotel = fiche.hotelUser && fiche.hotelUser.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'superadmin';

    if (!isOwner && !isHotel && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }

    res.json({ success: true, fiche });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
//  PATCH /api/fiches/:id/valider  (+ génération PDF)
// ============================================================
router.patch('/:id/valider', protect, authorize('hotel'), hotelApproved, async (req, res) => {
  try {
    const fiche = await Fiche.findById(req.params.id)
      .populate('client', 'email')
      .populate('hotel', 'nomHotel ville adresse telephone');

    if (!fiche) return res.status(404).json({ success: false, message: 'Fiche introuvable.' });

    if (fiche.hotelUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Cette fiche n'appartient pas à votre hôtel." });
    }
    if (fiche.statut !== 'pending') {
      return res.status(400).json({ success: false, message: `La fiche est déjà : ${fiche.statut}.` });
    }

    const hotelDoc = fiche.hotel || await Hotel.findById(fiche.hotel);
    let filename = null;
    try {
      filename = await generateFichePdf(fiche, hotelDoc);
    } catch (pdfErr) {
      console.error('Erreur génération PDF:', pdfErr);
    }

    fiche.statut = 'registered';
    if (filename) fiche.pdfFiche = filename;
    fiche.traitePar = req.user._id;
    fiche.traiteAt = new Date();
    await fiche.save();

    if (fiche.client?.email) {
      emailSvc.sendFicheValidated(fiche.client.email, fiche).catch(console.error);
    }

    notify({
      user: fiche.client._id,
      type: 'fiche_registered',
      title: '✅ Votre fiche a été validée',
      message: `Votre fiche ${fiche.reference} a été validée par l'hôtel et sera transmise à la police.`,
      fiche: fiche._id,
      link: 'form.html',
    }).catch(console.error);

    res.json({
      success: true,
      message: filename
        ? 'Fiche validée et PDF officiel généré.'
        : 'Fiche validée (PDF non généré — réessayez plus tard).',
      fiche,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
//  PATCH /api/fiches/:id/refuser
// ============================================================
router.patch('/:id/refuser', protect, authorize('hotel'), hotelApproved, [
  body('motif').optional().isString(),
], validate, async (req, res) => {
  try {
    const fiche = await Fiche.findById(req.params.id).populate('client', 'email');
    if (!fiche) return res.status(404).json({ success: false, message: 'Fiche introuvable.' });

    if (fiche.hotelUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Cette fiche n'appartient pas à votre hôtel." });
    }
    if (fiche.statut !== 'pending') {
      return res.status(400).json({ success: false, message: `La fiche est déjà : ${fiche.statut}.` });
    }

    fiche.statut = 'refused';
    fiche.refusMotif = req.body.motif || 'Informations non conformes';
    fiche.traitePar = req.user._id;
    fiche.traiteAt = new Date();
    await fiche.save();

    const hotel = await Hotel.findById(fiche.hotel);
    if (hotel) {
      const chambre = hotel.chambres.find(c => c.numero === fiche.chambreNumero);
      if (chambre) {
        chambre.disponible = true;
        await hotel.save();
      }
    }

    if (fiche.client?.email) {
      emailSvc.sendFicheRefused(fiche.client.email, fiche).catch(console.error);
    }

    notify({
      user: fiche.client._id,
      type: 'fiche_refused',
      title: '❌ Votre fiche a été refusée',
      message: `Votre fiche ${fiche.reference} a été refusée. Motif : ${fiche.refusMotif}`,
      fiche: fiche._id,
      link: 'form.html',
    }).catch(console.error);

    res.json({ success: true, message: 'Fiche refusée.', fiche });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
//  PATCH /api/fiches/:id/transmettre-police
// ============================================================
router.patch('/:id/transmettre-police', protect, authorize('hotel', 'superadmin'), async (req, res) => {
  try {
    const fiche = await Fiche.findById(req.params.id)
      .populate('client', 'nom prenom email')
      .populate('hotel', 'nomHotel ville');

    if (!fiche) return res.status(404).json({ success: false, message: 'Fiche introuvable.' });

    if (req.user.role === 'hotel') {
      if (fiche.hotelUser.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Accès refusé.' });
      }
    }

    if (fiche.statut !== 'registered') {
      return res.status(400).json({
        success: false,
        message: 'Impossible : Seules les fiches validées peuvent être transmises à la police.',
        statutActuel: fiche.statut,
      });
    }

    const refPolice = `POLICE-${Date.now()}-${fiche.reference}`;

    fiche.statut = 'transmitted';
    fiche.transmisAt = new Date();
    fiche.transmisReference = refPolice;
    await fiche.save();

    notify({
      user: fiche.client._id,
      type: 'fiche_transmitted',
      title: '📤 Fiche transmise à la police',
      message: `Votre fiche ${fiche.reference} a été transmise aux autorités. Référence : ${refPolice}`,
      fiche: fiche._id,
      link: 'form.html',
    }).catch(console.error);

    console.log(`🚔 Fiche transmise à la police : ${refPolice}`);

    res.json({
      success: true,
      message: 'Fiche transmise à la police.',
      referencePolice: refPolice,
      fiche,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
//  GET /api/fiches/:id/cnib
// ============================================================
router.get('/:id/cnib', protect, authorize('hotel', 'superadmin'), async (req, res) => {
  try {
    const fiche = await Fiche.findById(req.params.id);
    if (!fiche || !fiche.cnibFichier) {
      return res.status(404).json({ success: false, message: 'Fichier introuvable.' });
    }

    if (req.user.role === 'hotel' && fiche.hotelUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }

    const filePath = path.join(UPLOAD_ROOT, 'cnib', fiche.cnibFichier);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Fichier physique introuvable.' });
    }

    res.download(filePath, `CNIB_${fiche.nom}_${fiche.prenom}.pdf`);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
//  GET /api/fiches/:id/fiche-pdf/download
// ============================================================
router.get('/:id/fiche-pdf/download', protect, authorize('hotel', 'superadmin'), async (req, res) => {
  try {
    const fiche = await Fiche.findById(req.params.id);

    if (!fiche) {
      return res.status(404).json({ success: false, message: 'Fiche introuvable.' });
    }

    if (req.user.role === 'hotel' && fiche.hotelUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }

    if (!fiche.pdfFiche) {
      return res.status(404).json({
        success: false,
        message: "Le PDF de la fiche n'existe pas encore. Validez d'abord la fiche.",
      });
    }

    const filePath = path.join(UPLOAD_ROOT, 'fiches', fiche.pdfFiche);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Fichier PDF introuvable sur le serveur.',
      });
    }

    fiche.downloadedAt = new Date();
    fiche.isArchived = true;
    if (!fiche.archivedAt) fiche.archivedAt = new Date();
    await fiche.save();

    res.download(filePath, `Fiche_${fiche.reference || fiche._id}.pdf`);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
//  GET /api/fiches/:id/documents/status
// ============================================================
router.get('/:id/documents/status', protect, authorize('hotel', 'superadmin'), async (req, res) => {
  try {
    const fiche = await Fiche.findById(req.params.id).select('cnibFichier pdfFiche downloadedAt isArchived hotelUser');
    if (!fiche) return res.status(404).json({ success: false, message: 'Fiche introuvable.' });

    if (req.user.role === 'hotel' && fiche.hotelUser && fiche.hotelUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }

    res.json({
      success: true,
      hasCnib: !!fiche.cnibFichier,
      hasFichePdf: !!fiche.pdfFiche,
      downloadedAt: fiche.downloadedAt || null,
      isArchived: fiche.isArchived || false,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
//  DELETE /api/fiches/:id
// ============================================================
router.delete('/:id', protect, authorize('hotel'), hotelApproved, async (req, res) => {
  try {
    const fiche = await Fiche.findById(req.params.id);
    if (!fiche) return res.status(404).json({ success: false, message: 'Fiche introuvable.' });

    if (fiche.hotelUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Cette fiche ne vous appartient pas.' });
    }

    if (fiche.statut === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une fiche en attente de traitement.',
      });
    }

    await Fiche.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Fiche supprimée des archives avec succès.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;