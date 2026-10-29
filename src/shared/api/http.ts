import { apiUrl } from "./config";

export class ApiError extends Error {
    status: number;
    code?: string;
    requestId?: string;
    details?: Record<string, unknown>;
    constructor(status: number, metadata?: {code?: string; requestId?: string; details?: Record<string, unknown>}) {
        super(status === 401 ? "E-mail ou senha inválidos, ou sessão expirada." : status === 403 ? "Acesso não autorizado." : status === 429 ? "Muitas tentativas. Aguarde antes de tentar novamente." : "Não foi possível concluir a solicitação ao servidor.");
        this.status = status;
        this.code = metadata?.code;
        this.requestId = metadata?.requestId;
        this.details = metadata?.details;
    }
}

export async function request<T>(path: string, options: RequestInit = {}, responseType: "json" | "blob" = "json"): Promise<T> {
    let response: Response;
    try {
        response = await fetch(`${apiUrl}${path}`, { ...options, credentials: "include", cache: "no-store" });
    } catch (error) {
        if (options.signal?.aborted) throw error;
        throw new Error("Não foi possível conectar ao Backend. Verifique sua conexão.");
    }
    if (!response.ok) {
        // Preserve structured diagnostics; UI messages remain locally controlled.
        let metadata: {code?: string; requestId?: string; details?: Record<string, unknown>} | undefined;
        try {
            const body = await response.json();
            const error = body?.error;
            if (error && typeof error === "object") metadata = {
                code: typeof error.code === "string" && /^[A-Z0-9_]{1,100}$/.test(error.code) ? error.code : undefined,
                requestId: typeof error.request_id === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(error.request_id) ? error.request_id : undefined,
                details: error.details && typeof error.details === "object" && !Array.isArray(error.details) ? error.details : undefined,
            };
        } catch { /* Non-JSON errors still preserve their HTTP status. */ }
        throw new ApiError(response.status, metadata);
    }
    if (responseType === "blob") {
        const mime = response.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase();
        if (mime !== "image/png" && mime !== "image/jpeg") throw new Error("Formato de imagem não autorizado.");
        return response.blob() as Promise<T>;
    }
    return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export function assertProductImagePath(path: string): void {
    const uuid = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
    if (!new RegExp(`^/api/v1/products/${uuid}/images/${uuid}/content$`).test(path)) throw new Error("Caminho de imagem não autorizado.");
}
export function requestBlob(path: string, options: RequestInit = {}): Promise<Blob> {
    assertProductImagePath(path);
    return request<Blob>(path, { ...options, method: "GET", redirect: "error" }, "blob");
}
