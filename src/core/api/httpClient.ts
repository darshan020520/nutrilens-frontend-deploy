import axios from "axios";

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function resolveApiBaseUrl(): string {
  const envBase = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envBase) {
    const normalizedBase = envBase.replace(/\/+$/, "");
    return normalizedBase.endsWith("/api") ? normalizedBase : `${normalizedBase}/api`;
  }

  if (typeof window !== "undefined") {
    if (isLocalHostname(window.location.hostname)) {
      return "http://localhost:8000/api";
    }

    // Avoid sending non-local users to their own localhost when env is missing.
    console.warn("NEXT_PUBLIC_API_URL is not set. Falling back to same-origin /api.");
    return `${window.location.origin.replace(/\/+$/, "")}/api`;
  }

  return "http://localhost:8000/api";
}

const API_URL = resolveApiBaseUrl();

export const httpClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

httpClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
