const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const MAX_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '5');
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// Créer le dossier si inexistant
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ============================================================
//  Stockage sur disque avec nom unique
// ============================================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const sub = path.join(UPLOAD_DIR, 'cnib');
        if (!fs.existsSync(sub)) fs.mkdirSync(sub, { recursive: true });
        cb(null, sub);
    },
    filename: (req, file, cb) => {
        const ext  = path.extname(file.originalname).toLowerCase();
        const name = `cnib_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
        cb(null, name);
    },
});

// ============================================================
//  Filtre : PDF uniquement
// ============================================================
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Seuls les fichiers PDF sont acceptés.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_MB * 1024 * 1024 },
});

module.exports = upload;
