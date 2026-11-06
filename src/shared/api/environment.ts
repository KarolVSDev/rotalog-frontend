type EnvironmentValues = { VITE_AUTH_MODE?: string; VITE_API_URL?: string };

export function validateEnvironment(values: EnvironmentValues, deploy: boolean) {
    const mode = values.VITE_AUTH_MODE ?? (deploy ? undefined : "mock");
    if (deploy && mode !== "api") throw new Error("Build para deploy exige VITE_AUTH_MODE=api explicitamente. O modo mock está disponível somente no desenvolvimento.");
    if (mode !== "mock" && mode !== "api") throw new Error("VITE_AUTH_MODE deve ser mock ou api.");
    const rawUrl = values.VITE_API_URL;
    if (mode === "api" && !rawUrl) throw new Error("Modo API exige VITE_API_URL explícita, com URL absoluta HTTP ou HTTPS.");
    if (!rawUrl) return { authMode: mode, apiUrl: "" };
    let url: URL;
    try { url = new URL(rawUrl); } catch { throw new Error("VITE_API_URL inválida: informe uma URL absoluta HTTP ou HTTPS."); }
    if (!/^https?:\/\//i.test(rawUrl) || rawUrl !== rawUrl.trim() || !["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
        throw new Error("VITE_API_URL inválida: use HTTP ou HTTPS, sem credenciais, consulta ou fragmento.");
    }
    return { authMode: mode, apiUrl: rawUrl.replace(/\/+$/, "") };
}
