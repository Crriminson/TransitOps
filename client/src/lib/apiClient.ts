import axios from "axios";
import { useAuthStore } from "../store/authStore";

// Feature branches after Step 1 import this wrapper instead of calling
// fetch/axios directly — the Authorization header is attached here once.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL ?? "http://localhost:4000",
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
