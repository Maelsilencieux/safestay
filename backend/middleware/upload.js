const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');

const MAX_MB      = parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10);
const UPLOAD_ROOT = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
const CNIB_DIR    = path.join(UPLOAD_ROOT, 'cnib');

fs.mkdirSync(CNIB_DIR, { recursive: true });

// ============================================================
//  Stockage : nom aléatoire, extension forcée à .pdf
// ============================================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, CNIB_DIR),
    filename: (req, file, cb) => {
        cb(null, `cnib_${Date.now()}_${crypto.randomBytes(8).toString('hex')}.pdf`);
    },
});

// Premier filtre : type annoncé par le client (falsifiable, vérifié ensuite)
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype === 'application/pdf' && ext === '.pdf') {
        cb(null, true);
    } else {
        cb(new Error('Seuls les fichiers PDF sont acceptés.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_MB * 1024 * 1024,
        files: 1,
        fields: 40,
        fieldSize: 20 * 1024,
    },
});

// ============================================================
//  Second filtre : contenu réel du fichier
//  À placer APRÈS upload.single(...) : upload.single('cnib'), upload.verifyPdf
// ============================================================
const CONTENU_ACTIF = /\/(JavaScript|JS|Launch|EmbeddedFile)(?![A-Za-z])/;
 

function supprimer(file) {
    if (file && file.path) fs.unlink(file.path, () => {});
}

upload.verifyPdf = (req, res, next) => {
    if (!req.file) return next();

    try {
        const contenu = fs.readFileSync(req.file.path);

        // 1. Signature d'un vrai PDF
        if (contenu.length < 100 || contenu.subarray(0, 5).toString('latin1') !== '%PDF-') {
            supprimer(req.file);
            return res.status(400).json({ success: false, message: "Le fichier n'est pas un PDF valide." });
        }

        // 2. Contenu actif (scripts, lancement de programmes, pièces jointes)
        if (process.env.PDF_BLOCK_ACTIVE_CONTENT !== 'false' &&
            CONTENU_ACTIF.test(contenu.toString('latin1'))) {
            supprimer(req.file);
            return res.status(400).json({
                success: false,
                message: 'Ce PDF contient des éléments actifs non autorisés. Envoyez un scan simple.',
            });
        }

        next();
    } catch (err) {
        supprimer(req.file);
        return res.status(400).json({ success: false, message: 'Fichier illisible.' });
    }
};

module.exports = upload;