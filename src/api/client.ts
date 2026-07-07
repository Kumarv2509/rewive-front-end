import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_BASE_API_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

export const builderClient = axios.create({
  baseURL: import.meta.env.VITE_BUILDER_API_URL ?? '/builder',
  headers: { 'Content-Type': 'application/json' },
});
