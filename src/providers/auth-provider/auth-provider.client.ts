"use client";

import type { AuthProvider } from "@refinedev/core";
import Cookies from "js-cookie";

const AUTH_COOKIE = "auth";
const PERMISSIONS_STORAGE_KEY = "rm_permissions";
const PROFILE_STORAGE_KEY = "rm_profile";
export const TOUR_STORAGE_KEY = "rm_tour_completed";

function setSession(user: {
  name: string;
  email: string;
  role: string;
  permissions?: string[];
  avatar?: string;
  tourCompleted?: boolean;
}) {
  const identity = { name: user.name, email: user.email, role: user.role };

  Cookies.set(AUTH_COOKIE, JSON.stringify(identity), {
    expires: 30,
    path: "/",
  });

  try {
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(user.permissions || []));
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(Boolean(user.tourCompleted)));
    if (user.avatar) {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ avatar: user.avatar }));
    }
  } catch {
    // Ignore localStorage errors (e.g. private mode)
  }
}

function clearSession() {
  Cookies.remove(AUTH_COOKIE, { path: "/" });
  try {
    localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    localStorage.removeItem(TOUR_STORAGE_KEY);
    localStorage.removeItem("gojags_access_token");
    localStorage.removeItem("gojags_refresh_token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_unit");
    localStorage.removeItem("user_nip");
  } catch {
    // Ignore localStorage errors
  }
}

function readStoredPermissions(): string[] {
  try {
    const raw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function readStoredProfile(): { avatar?: string } {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export const authProviderClient: AuthProvider = {
  login: async ({ email, password }) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Email atau password salah" }));
      throw new Error(errorData.error || "Email atau password salah");
    }

    const user = await response.json();

    setSession(user);

    return {
      success: true,
      redirectTo: "/",
    };
  },
  logout: async () => {
    clearSession();
    return {
      success: true,
      redirectTo: "/login",
    };
  },
  check: async () => {
    const auth = Cookies.get(AUTH_COOKIE);
    if (auth) {
      return {
        authenticated: true,
      };
    }

    return {
      authenticated: false,
      logout: true,
      redirectTo: "/login",
    };
  },
  getPermissions: async () => {
    const auth = Cookies.get(AUTH_COOKIE);
    if (!auth) return null;
    return readStoredPermissions();
  },
  getIdentity: async () => {
    const auth = Cookies.get(AUTH_COOKIE);
    if (!auth) return null;
    const parsedUser = JSON.parse(auth);
    return {
      ...parsedUser,
      ...readStoredProfile(),
      permissions: readStoredPermissions(),
    };
  },
  onError: async (error) => {
    if (error.response?.status === 401) {
      return {
        logout: true,
      };
    }

    return { error };
  },
};
