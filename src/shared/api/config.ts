const mode = import.meta.env.VITE_AUTH_MODE ?? "mock";
if (mode !== "mock" && mode !== "api") throw new Error("VITE_AUTH_MODE deve ser mock ou api.");
export const authMode = mode;
export const apiUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
