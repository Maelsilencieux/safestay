// ===== SafeStay Types =====

export type UserRole = "client" | "hotel" | "admin" | "superadmin";

export type FicheStatut = "pending" | "registered" | "refused" | "transmitted";

export interface User {
  _id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  role: UserRole;
  nomHotel?: string;
  createdAt?: string;
}

export interface Hotel {
  _id: string;
  nomHotel: string;
  email: string;
  adresseHotel?: string;
  villeHotel?: string;
  telephone?: string;
  rccm?: string;
  statut: "pending" | "approved" | "rejected";
  hotelStatus?: string;
  isActive?: boolean;
  chambres?: Chambre[];
  createdAt?: string;
}

export interface Chambre {
  _id: string;
  numero: string;
  type: string;
  capacite: number;
  prix?: number;
  disponible: boolean;
  description?: string;
}

export interface Fiche {
  _id: string;
  client?: User | string;
  hotel?: Hotel | string | { nomHotel?: string };
  // Identité
  nom: string;
  prenom: string;
  dateNaissance?: string;
  lieuNaissance?: string;
  nationalite?: string;
  flagEmoji?: string;
  profession?: string;
  adresse?: string;
  ville?: string;
  bp?: string;
  pieceIdentite?: string;
  numeroPiece?: string;
  delivreLe?: string;
  delivreA?: string;
  // Voyage
  provenance?: string;
  venantDe?: string;
  destination?: string;
  allantA?: string;
  motif?: string;
  // Séjour
  dateArrivee?: string;
  dateEntree?: string;
  dateDepart?: string;
  dateSortie?: string;
  chambre?: string;
  chambreNumero?: string;
  transport?: string;
  plaque?: string;
  // Paiement
  modePaiement?: "cash" | "cheque" | "carte" | "voucher" | string;
  // Meta
  statut: FicheStatut;
  reference?: string;
  cnibFichier?: string | null;
  pdfFiche?: string | null;
  documents?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface Notification {
  _id: string;
  titre: string;
  message: string;
  read: boolean;
  createdAt: string;
  type?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: unknown;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

export interface FicheFormData {
  nom: string;
  prenom: string;
  dateNaissance: string;
  lieuNaissance: string;
  nationalite: string;
  profession: string;
  adresse: string;
  ville: string;
  bp: string;
  pieceIdentite: string;
  numeroPiece: string;
  delivreLe: string;
  delivreA: string;
  provenance: string;
  destination: string;
  motif: string;
  hotelId: string;
  dateArrivee: string;
  dateDepart: string;
  chambre: string;
  transport: string;
  plaque: string;
  modePaiement: "cash" | "cheque" | "carte" | "voucher";
  cnibFile?: File | null;
}

export interface HotelStats {
  total: number;
  pending: number;
  validated: number;
  registered?: number;
  refused: number;
  transmitted?: number;
}
