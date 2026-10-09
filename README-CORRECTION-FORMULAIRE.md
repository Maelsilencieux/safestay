# SafeStay — correction formulaire / Multer / CORS

## Ce qui a été corrigé

- `cnibFile` n'est plus envoyé directement au backend : le frontend l'envoie sous le nom multipart `cnib`, attendu par `upload.single('cnib')`.
- `photoFile` a été supprimé car le backend ne prévoit pas de champ photo et accepte les PDF uniquement.
- Les champs frontend sont maintenant mappés vers les noms backend :
  - `provenance` → `venantDe`
  - `destination` → `allantA`
  - `pieceIdentite` → `typePiece`
  - `dateArrivee` → `dateEntree`
  - `dateDepart` → `dateSortie`
  - `chambre` → `chambreNumero`
- Ajout des champs requis par l'API : lieu de naissance, adresse, ville, date et lieu de délivrance de la pièce.
- Le formulaire exige désormais le numéro de chambre avant l'envoi.
- Le sélecteur de fichier accepte uniquement les PDF, conformément au middleware Multer.
- Les erreurs Multer sont renvoyées en JSON avec un statut 400 plutôt qu'en erreur 500 générique.
- Le proxy Next.js et le CORS backend restent configurés pour `localhost:3000` et `localhost:5000`.

## Lancer le projet

### Backend

```powershell
cd backend
npm install
copy .env.example .env
npm run dev
```

Vérifier :

```text
http://localhost:5000/api/health
```

### Frontend

À la racine du projet :

```powershell
npm install
npm run dev
```

Puis ouvrir :

```text
http://localhost:3000
```

## Important

Le fichier `backend/.env` n'est pas inclus dans cette archive afin de ne pas exposer les mots de passe ou clés. Copiez `backend/.env.example` vers `backend/.env` et renseignez vos valeurs MongoDB/JWT/mail si nécessaire.
