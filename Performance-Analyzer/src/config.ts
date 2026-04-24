/**
 * Application configuration.
 * All environment-dependent values are read from Vite environment variables.
 */

/** Base URL for the backend API. Defaults to localhost:8000 for development. */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
