import type { ApiResponse, AuthResponse, User, Hotel, Chambre, Fiche, Notification } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/backend";

// ===== Session helpers (client-side) =====
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ss_token");
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("ss_current_user") || "null");
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: User) {
  localStorage.setItem("ss_token", token);
  localStorage.setItem("ss_current_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("ss_token");
  localStorage.removeItem("ss_current_user");
}

// ===== Generic fetch =====
async function apiCall<T = unknown>(
  method: string,
  endpoint: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; data: ApiResponse<T> }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  try {
    const resp = await fetch(`${API_BASE}${endpoint}`, opts);
    let data: ApiResponse<T>;
    try {
      data = await resp.json();
    } catch {
      data = { success: false, message: "Réponse invalide du serveur." };
    }

    if (resp.status === 401) {
      clearSession();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    return { ok: resp.ok, status: resp.status, data };
  } catch (err) {
    console.error("Erreur réseau :", err);
    return {
      ok: false,
      status: 0,
      data: {
        success: false,
        message: "Impossible de joindre le serveur. Vérifiez votre connexion.",
      },
    };
  }
}

async function apiUpload(
  endpoint: string,
  formData: FormData
): Promise<{ ok: boolean; status: number; data: ApiResponse }> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const resp = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers,
      body: formData,
    });
    let data: ApiResponse;
    try {
      data = await resp.json();
    } catch {
      data = { success: false, message: "Réponse invalide du serveur." };
    }

    if (resp.status === 401) {
      clearSession();
      if (typeof window !== "undefined") window.location.href = "/login";
    }

    return { ok: resp.ok, status: resp.status, data };
  } catch (err) {
    console.error("Erreur réseau :", err);
    return {
      ok: false,
      status: 0,
      data: {
        success: false,
        message: "Impossible de joindre le serveur. Vérifiez votre connexion.",
      },
    };
  }
}

// ===== AUTH =====
export const Auth = {
  async login(email: string, password: string) {
    return apiCall<AuthResponse>("POST", "/auth/login", { email, password });
  },
  async registerClient(data: {
    nom: string;
    prenom: string;
    email: string;
    password: string;
    telephone?: string;
  }) {
    return apiCall("POST", "/auth/register/client", data);
  },
  async registerHotel(data: {
    nomHotel: string;
    email: string;
    password: string;
    rccm?: string;
    adresseHotel?: string;
    villeHotel?: string;
    telephone?: string;
  }) {
    return apiCall("POST", "/auth/register/hotel", data);
  },
  async me() {
    return apiCall<User>("GET", "/auth/me");
  },
  async logout() {
    await apiCall("POST", "/auth/logout");
    clearSession();
  },
  async forgotPassword(email: string) {
    return apiCall("POST", "/auth/forgot-password", { email });
  },
  async verifyResetToken(token: string, email: string) {
    const q = new URLSearchParams({ token, email }).toString();
    return apiCall("GET", `/auth/verify-reset-token?${q}`);
  },
  async resetPassword(token: string, email: string, password: string) {
    return apiCall("POST", "/auth/reset-password", { token, email, password });
  },
};

// ===== HOTELS =====
export const Hotels = {
  async getAll() {
    const res = await apiCall<{ hotels: Hotel[] }>("GET", "/hotels");
    if (res.ok && res.data.success) {
      return (res.data as any).hotels || res.data.data || [];
    }
    return [] as Hotel[];
  },
  async getChambres(hotelId: string) {
    return apiCall("GET", `/hotels/${hotelId}/chambres`);
  },
  async getMonHotel() {
    return apiCall<Hotel>("GET", "/hotels/mon-hotel");
  },
  async updateMonHotel(data: Partial<Hotel>) {
    return apiCall("PUT", "/hotels/mon-hotel", data);
  },
  async addChambre(data: Partial<Chambre>) {
    return apiCall("POST", "/hotels/mon-hotel/chambres", data);
  },
  async updateChambre(chambreId: string, data: Partial<Chambre>) {
    return apiCall("PUT", `/hotels/mon-hotel/chambres/${chambreId}`, data);
  },
  async deleteChambre(chambreId: string) {
    return apiCall("DELETE", `/hotels/mon-hotel/chambres/${chambreId}`);
  },
};

// ===== FICHES =====
export const Fiches = {
  async submit(formData: FormData) {
    return apiUpload("/fiches", formData);
  },
  async mesFiches() {
    return apiCall<Fiche[]>("GET", "/fiches/mes-fiches");
  },
  async hotelFiches(params: Record<string, string> = {}) {
    const q = new URLSearchParams(params).toString();
    return apiCall<Fiche[]>("GET", `/fiches/hotel${q ? "?" + q : ""}`);
  },
  async hotelDocuments(params: Record<string, string> = {}) {
    const q = new URLSearchParams(params).toString();
    return apiCall("GET", `/fiches/hotel/documents${q ? "?" + q : ""}`);
  },
  async hotelStats() {
    return apiCall("GET", "/fiches/hotel/stats");
  },
  async getById(id: string) {
    return apiCall<Fiche>("GET", `/fiches/${id}`);
  },
  async getOne(id: string) {
    return apiCall<Fiche>("GET", `/fiches/${id}`);
  },
  async valider(id: string) {
    return apiCall("PATCH", `/fiches/${id}/valider`);
  },
  async refuser(id: string, motif?: string) {
    return apiCall("PATCH", `/fiches/${id}/refuser`, { motif });
  },
  async transmettrePolice(id: string) {
    return apiCall("PATCH", `/fiches/${id}/transmettre-police`);
  },
  async delete(id: string) {
    return apiCall("DELETE", `/fiches/${id}`);
  },
  cnibUrl(id: string) {
    return `${API_BASE}/fiches/${id}/cnib`;
  },
  fichePdfUrl(id: string) {
    return `${API_BASE}/fiches/${id}/fiche-pdf`;
  },
  fichePdfDownloadUrl(id: string) {
    return `${API_BASE}/fiches/${id}/fiche-pdf/download`;
  },
};


 // ===== ADMIN =====
export const Admin = {
  async stats() {
    return apiCall("GET", "/admin/stats");
  },

  async hotels(statut?: string) {
    const q = statut
      ? `?statut=${encodeURIComponent(statut)}`
      : "";
    return apiCall("GET", `/admin/hotels${q}`);
  },

  async fiches(params: Record<string, string> = {}) {
    const q = new URLSearchParams(params).toString();
    return apiCall("GET", `/admin/fiches${q ? `?${q}` : ""}`);
  },

  async clients() {
    return apiCall("GET", "/admin/clients");
  },

  async users(role?: string) {
    const q = role
      ? `?role=${encodeURIComponent(role)}`
      : "";
    return apiCall("GET", `/admin/users${q}`);
  },

  async approuver(userId: string) {
    return apiCall("PATCH", `/admin/hotels/${userId}/approuver`);
  },

  async rejeter(userId: string, motif?: string) {
    return apiCall("PATCH", `/admin/hotels/${userId}/rejeter`, {
      motif,
    });
  },

  async approveHotel(
    id: string,
    statut: "approved" | "rejected"
  ) {
    if (statut === "approved") {
      return this.approuver(id);
    }
    return this.rejeter(id);
  },

  async toggleUser(userId: string) {
    return apiCall("PATCH", `/admin/users/${userId}/toggle`);
  },

  async deleteUser(userId: string) {
    return apiCall("DELETE", `/admin/users/${userId}`);
  },

  async documents() {
    return apiCall("GET", "/admin/documents");
  },

  documentViewUrl(id: string) {
    return `${API_BASE}/admin/documents/${id}/view`;
  },

  documentDownloadUrl(id: string) {
    return `${API_BASE}/admin/documents/${id}/download`;
  },

  fichePdfUrl(id: string) {
    return `${API_BASE}/admin/documents/${id}/fiche`;
  },

  fichePdfDownloadUrl(id: string) {
    return `${API_BASE}/admin/documents/${id}/download-fiche`;
  },

  async deleteDocument(id: string) {
    return apiCall("DELETE", `/admin/documents/${id}`);
  },
};

// ===== NOTIFICATIONS =====
export const Notifications = {
  async list(unreadOnly = false) {
    return apiCall<Notification[]>(
      "GET",
      `/notifications${unreadOnly ? "?unreadOnly=true" : ""}`
    );
  },
  async unreadCount() {
    return apiCall<{ count: number }>("GET", "/notifications/unread-count");
  },
  async markRead(id: string) {
    return apiCall("PUT", `/notifications/${id}/read`);
  },
  async delete(id: string) {
    return apiCall("DELETE", `/notifications/${id}`);
  },
};
