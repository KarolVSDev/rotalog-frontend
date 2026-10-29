import { validateEnvironment } from "./environment";

const configuration = validateEnvironment({ VITE_AUTH_MODE: import.meta.env.VITE_AUTH_MODE, VITE_API_URL: import.meta.env.VITE_API_URL }, import.meta.env.PROD);
export const authMode = configuration.authMode;
export const apiUrl = configuration.apiUrl;
