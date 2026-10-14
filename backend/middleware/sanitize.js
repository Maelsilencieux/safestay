const mongoose = require('mongoose');

const PROFONDEUR_MAX = 10;

// Détecte les clés dangereuses ($ne, $gt, a.b ...) dans un objet imbriqué
function contientCleInterdite(valeur, profondeur = 0) {
    if (profondeur > PROFONDEUR_MAX) return true;
    if (Array.isArray(valeur)) {
        return valeur.some(v => contientCleInterdite(v, profondeur + 1));
    }
    if (valeur && typeof valeur === 'object') {
        return Object.keys(valeur).some(
            cle => cle.startsWith('$') || cle.includes('.') ||
                   contientCleInterdite(valeur[cle], profondeur + 1)
        );
    }
    return false;
}

// Rejette toute requête contenant un opérateur MongoDB injecté
exports.noSqlGuard = (req, res, next) => {
    if (
        contientCleInterdite(req.body) ||
        contientCleInterdite(req.query) ||
        contientCleInterdite(req.params)
    ) {
        return res.status(400).json({ success: false, message: 'Requête invalide.' });
    }
    next();
};

// Retourne une chaîne nettoyée, ou undefined si la valeur n'est pas du texte
exports.asString = (valeur, max = 100) =>
    typeof valeur === 'string' ? valeur.trim().slice(0, max) : undefined;

// Retourne la valeur seulement si elle fait partie de la liste autorisée
exports.oneOf = (valeur, autorises) => (autorises.includes(valeur) ? valeur : undefined);

// Échappe une saisie utilisateur avant de l'utiliser dans une RegExp
exports.escapeRegex = (texte) => texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Pagination sûre : page >= 1, limit bornée
exports.parsePagination = (query, limiteParDefaut = 20, limiteMax = 100) => {
    const page  = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || limiteParDefaut, 1), limiteMax);
    return { page, limit, skip: (page - 1) * limit };
};

// Pour router.param('id', ...) : refuse les identifiants mal formés (évite un 500)
exports.validerParamId = (req, res, next, valeur) => {
    if (!mongoose.isValidObjectId(valeur)) {
        return res.status(400).json({ success: false, message: 'Identifiant invalide.' });
    }
    next();
};