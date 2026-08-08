const apiUrl = import.meta.env.VITE_API_URL;
const tmdbImageUrl = import.meta.env.VITE_TMDB_IMAGE_URL;

if (!apiUrl) {
    throw new Error("VITE_API_URL is not configured");
}

if (!tmdbImageUrl) {
    throw new Error("VITE_TMDB_IMAGE_URL is not configured");
}

export const API_URL = apiUrl;
export const TMDB_IMAGE_URL = tmdbImageUrl;
