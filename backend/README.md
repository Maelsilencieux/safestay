# SafeStay — Backend API

API REST Node.js + MongoDB pour la digitalisation des fiches de police hôtelières.

---

## 🗂 Structure du projet

```
safestay-backend/
├── config/
│   └── db.js               — Connexion MongoDB
├── middleware/
│   ├── auth.js             — JWT protect + guards de rôle
│   └── upload.js           — Multer (PDF CNIB/Passeport)
├── models/
│   ├── User.js             — Clients, Hôtels, SuperAdmin
│   ├── Hotel.js            — Profil hôtel + chambres
│   └── Fiche.js            — Fiches d'enregistrement
├── routes/
│   ├── auth.js             — Inscription / Connexion
│   ├── hotels.js           — Hôtels + gestion chambres
│   ├── fiches.js           — CRUD fiches + workflow
│   └── admin.js            — SuperAdmin (validation hôtels, vue globale)
├── utils/
│   ├── jwt.js              — Génération tokens
│   └── email.js            — Emails Nodemailer
├── uploads/                — Fichiers PDF CNIB (créé automatiquement)
├── .env.example
├── package.json
└── server.js               — Point d'entrée
```

---

## ⚡ Installation

```bash
# 1. Cloner et installer
cd safestay-backend
npm install

# 2. Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos valeurs (MongoDB URI, JWT secrets, SMTP...)

# 3. Lancer en développement
npm run dev

# 4. Lancer en production
npm start
```

---

## 🔐 Rôles et accès

| Rôle         | Accès                                                      |
| ------------ | ---------------------------------------------------------- |
| `client`     | Soumettre des fiches, voir ses fiches                      |
| `hotel`      | Voir/valider/refuser les fiches, gérer les chambres        |
| `superadmin` | Approuver les hôtels, voir toutes les fiches, statistiques |

> ⚠️ Le compte hôtel n'est **pas actif immédiatement** après inscription.
> Le superadmin doit l'approuver manuellement via `PATCH /api/admin/hotels/:id/approuver`.

---

## 📡 Endpoints principaux

### Authentification

| Méthode | Route                       | Description                        |
| ------- | --------------------------- | ---------------------------------- |
| POST    | `/api/auth/register/client` | Créer un compte client             |
| POST    | `/api/auth/register/hotel`  | Créer un compte hôtel (en attente) |
| POST    | `/api/auth/login`           | Connexion (tous rôles)             |
| GET     | `/api/auth/me`              | Profil utilisateur connecté        |
| POST    | `/api/auth/logout`          | Déconnexion                        |

### Hôtels & Chambres

| Méthode | Route                                | Description                             |
| ------- | ------------------------------------ | --------------------------------------- |
| GET     | `/api/hotels`                        | Liste hôtels approuvés + chambres dispo |
| GET     | `/api/hotels/:id/chambres`           | Chambres disponibles d'un hôtel         |
| GET     | `/api/hotels/mon-hotel`              | Profil hôtel connecté                   |
| PUT     | `/api/hotels/mon-hotel`              | Mettre à jour infos hôtel               |
| POST    | `/api/hotels/mon-hotel/chambres`     | Ajouter une chambre                     |
| PUT     | `/api/hotels/mon-hotel/chambres/:id` | Modifier une chambre (dispo, prix...)   |
| DELETE  | `/api/hotels/mon-hotel/chambres/:id` | Supprimer une chambre                   |

### Fiches

| Méthode | Route                                | Description                           |
| ------- | ------------------------------------ | ------------------------------------- |
| POST    | `/api/fiches`                        | Soumettre une fiche (multipart + PDF) |
| GET     | `/api/fiches/mes-fiches`             | Fiches du client connecté             |
| GET     | `/api/fiches/hotel`                  | Fiches reçues par l'hôtel connecté    |
| GET     | `/api/fiches/hotel/stats`            | Statistiques dashboard hôtel          |
| GET     | `/api/fiches/:id`                    | Détail d'une fiche                    |
| PATCH   | `/api/fiches/:id/valider`            | Valider une fiche (hôtel)             |
| PATCH   | `/api/fiches/:id/refuser`            | Refuser une fiche (hôtel)             |
| PATCH   | `/api/fiches/:id/transmettre-police` | Transmettre à la police (hôtel/admin) |
| GET     | `/api/fiches/:id/cnib`               | Télécharger le PDF CNIB (hôtel/admin) |

### Admin

| Méthode | Route                              | Description                |
| ------- | ---------------------------------- | -------------------------- |
| GET     | `/api/admin/stats`                 | Statistiques globales      |
| GET     | `/api/admin/hotels?statut=pending` | Liste hôtels par statut    |
| PATCH   | `/api/admin/hotels/:id/approuver`  | Approuver un hôtel         |
| PATCH   | `/api/admin/hotels/:id/rejeter`    | Rejeter un hôtel (+ motif) |
| GET     | `/api/admin/fiches`                | Toutes les fiches          |
| GET     | `/api/admin/clients`               | Tous les clients           |

---

## 🔄 Cycle de vie d'une fiche

```
Client soumet    →  statut: "pending"
                        ↓
Hotel valide     →  statut: "registered"   → Email client ✅
Hotel refuse     →  statut: "refused"      → Email client ❌
                        ↓
Hotel transmet   →  statut: "transmitted"  → Base police 🚔
```

---

## ⚙️ Variables d'environnement (.env)

| Variable           | Description              | Défaut                         |
| ------------------ | ------------------------ | ------------------------------ |
| `PORT`             | Port du serveur          | `5000`                         |
| `MONGO_URI`        | URI MongoDB              | `mongodb://localhost/safestay` |
| `JWT_SECRET`       | Clé secrète JWT          | _(requis)_                     |
| `JWT_EXPIRE`       | Durée de vie token       | `7d`                           |
| `SMTP_HOST`        | Serveur SMTP             | `smtp.gmail.com`               |
| `SMTP_USER`        | Email expéditeur         | _(requis pour emails)_         |
| `MAX_FILE_SIZE_MB` | Taille max PDF           | `5`                            |
| `CLIENT_URL`       | URL front-end (CORS)     | `*`                            |
| `SUPERADMIN_EMAIL` | Email superadmin initial | `superadmin@safestay.bf`       |
