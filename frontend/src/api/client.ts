import axios from "axios";

import type { User } from "@/types";

const AUTH_STORAGE_KEY = "attendance_auth";
export const AUTH_CHANGED_EVENT = "attendance-auth-changed";

export interface StoredAuth {
  access_token: string;
  user: User;
}

export function getStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

export function setStoredAuth(auth: StoredAuth) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export const api = axios.create({ baseURL: "/api/v1" });

api.interceptors.request.use((config) => {
  const auth = getStoredAuth();
  if (auth?.access_token) {
    config.headers.Authorization = `Bearer ${auth.access_token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && getStoredAuth()) {
      clearStoredAuth();
    }
    return Promise.reject(error);
  },
);

const STATUS_MESSAGES: Record<number, string> = {
  400: "That request was invalid.",
  403: "You don't have permission to do that.",
  404: "We couldn't find that.",
  409: "That conflicts with existing data.",
  422: "Some fields need attention.",
  500: "Something went wrong on the server.",
};

export function extractApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => d.msg ?? String(d)).join(", ");
    }
    if (err.response?.status && STATUS_MESSAGES[err.response.status]) {
      return STATUS_MESSAGES[err.response.status];
    }
  }
  return "Unexpected error. Please try again.";
}
