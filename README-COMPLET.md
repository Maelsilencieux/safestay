# SafeStay — Portail institutionnel Burkina Faso

Projet complet avec frontend Next.js et backend Express/MongoDB.

## Structure

- Frontend : ce dossier (`src/`, `package.json`)
- Backend : `backend/`

## 1. Préparer MongoDB

Le backend utilise par défaut :

`mongodb://127.0.0.1:27017/safestay`

## 2. Installer le backend

Dans PowerShell :

```powershell
cd backend
npm install
copy .env.example .env
```

Puis ouvre `backend/.env` et renseigne au minimum :

- `JWT_SECRET`
- `JWT_POLICE_SECRET`
- `SUPERADMIN_PASSWORD`

Les paramètres CORS sont déjà prévus pour `localhost:3000` et `127.0.0.1:3000`.

## 3. Démarrer le backend

```powershell
cd backend
npm run dev
```

Le backend doit écouter sur :

`http://localhost:5000`

Test :

`http://localhost:5000/api/health`

## 4. Installer le frontend

Dans un deuxième terminal, depuis la racine du projet :

```powershell
npm install
npm run dev
```

Le frontend sera disponible sur :

`http://localhost:3000`

## 5. CORS / Proxy

Le navigateur appelle désormais :

`/api/backend/...`

Next.js transmet ces requêtes au backend :

`http://localhost:5000/api/...`

Cela évite que le navigateur fasse directement une requête cross-origin vers le port 5000.

## 6. Important

Le fichier `backend/.env` n'est pas fourni dans l'archive afin de ne pas distribuer de mots de passe, clés JWT, identifiants SMTP ou clés VAPID. Utilise `backend/.env.example` comme modèle.
