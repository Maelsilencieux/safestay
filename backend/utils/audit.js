const AuditLog = require('../models/AuditLog');

// Actions tracées (utilisées aussi pour le filtre de la page admin)
const ACTIONS = {
    FICHE_CREATE:    'fiche.create',
    FICHE_VIEW:      'fiche.view',
    FICHE_VALIDATE:  'fiche.validate',
    FICHE_REFUSE:    'fiche.refuse',
    FICHE_TRANSMIT:  'fiche.transmit',
    FICHE_DELETE:    'fiche.delete',
    CNIB_ACCESS:     'fiche.cnib.access',
    PDF_DOWNLOAD:    'fiche.pdf.download',
    ADMIN_CNIB_VIEW: 'admin.cnib.view',
    ADMIN_CNIB_DL:   'admin.cnib.download',
    ADMIN_PDF_VIEW:  'admin.pdf.view',
    ADMIN_PDF_DL:    'admin.pdf.download',
    ADMIN_DOC_DEL:   'admin.document.delete',
    HOTEL_CREATE:    'hotel.create',
    HOTEL_APPROVE:   'hotel.approve',
    HOTEL_REJECT:    'hotel.reject',
    USER_TOGGLE:     'user.toggle',
    USER_DEACTIVATE: 'user.deactivate',
    USER_DELETE:     'user.delete',
    EXPORT_FICHES:   'export.fiches',
};

/**
 * Enregistre une entrée d'audit. Ne lève jamais d'erreur :
 * un souci de journalisation ne doit pas bloquer l'action métier.
 * Utilisez `await audit(...)` avant une action destructrice.
 */
function audit(req, action, details = {}) {
    const { fiche, targetUser, targetLabel, meta } = details;
    return AuditLog.create({
        user:      req.user?._id,
        userRole:  req.user?.role,
        userEmail: req.user?.email,
        action,
        fiche:          fiche?._id,
        ficheReference: fiche?.reference,
        targetUser:     targetUser?._id,
        targetLabel:    targetLabel || targetUser?.nomHotel || targetUser?.email,
        ip:        req.ip,
        userAgent: (req.get('user-agent') || '').slice(0, 200),
        meta,
    }).catch(err => console.error('Audit :', err.message));
}

module.exports = { audit, ACTIONS };