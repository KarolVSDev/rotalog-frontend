import { authenticatedRequest } from "../../services/apiAuth.service";
import { ApiError } from "../../../shared/api/http";
import type { CanonicalProductImage } from "../../../shared/api/productImageTypes";
export type ProductGallery = { product_id: string; product_version: number; images: CanonicalProductImage[]; primary_image_id: string | null; is_synthetic: true };
type FileStatus = { file_id: string; product_id: string; status: string; rejection_reason: string | null };
type Intent = FileStatus & { upload_url: string; max_bytes: number; max_pixels: number };
export type ImageJob = { id: string; file: File; width: number; height: number; sha256: string; phase: string; intent?: Intent; uploaded?: boolean; confirmed?: boolean; attached?: boolean; terminal?: boolean; keys: { intent: string; upload: string; confirm: string } };
const maxBytes = 8 * 1024 * 1024;
export async function prepareImage(file: File): Promise<ImageJob> {
    if (!["image/png", "image/jpeg"].includes(file.type) || !file.size || file.size > maxBytes) throw new Error("Selecione PNG ou JPEG estático, íntegro, com até 8 MiB.");
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const png = bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
    const jpeg = bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!(file.type === "image/png" ? png : jpeg)) throw new Error("Os bytes do arquivo não correspondem a PNG/JPEG válido.");
    let bitmap: ImageBitmap;
    try { bitmap = await createImageBitmap(file); } catch { throw new Error("Não foi possível decodificar esta imagem."); }
    const { width, height } = bitmap; bitmap.close();
    if (!width || !height || width * height > 16000000) throw new Error("A imagem deve ter até 16 megapixels.");
    const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)), byte => byte.toString(16).padStart(2, "0")).join("");
    return { id: crypto.randomUUID(), file, width, height, sha256, phase: "Selecionada", keys: { intent: crypto.randomUUID(), upload: crypto.randomUUID(), confirm: crypto.randomUUID() } };
}
export class ProductImagesRepository {
    private organizationId: string;
    private transport: typeof authenticatedRequest;
    private keys = new Map<string, string>();
    constructor(organizationId: string, transport = authenticatedRequest) { this.organizationId = organizationId; this.transport = transport; }
    private options(signal?: AbortSignal): RequestInit {
        if (!this.organizationId) throw new Error("Organização indisponível. Entre novamente.");
        return { headers: { "X-Organization-Id": this.organizationId }, signal, redirect: "error" };
    }
    async gallery(productId: string, signal?: AbortSignal): Promise<ProductGallery> {
        const result = await this.transport<ProductGallery>(`/api/v1/products/${encodeURIComponent(productId)}/images`, this.options(signal));
        if (result.product_id !== productId || !Array.isArray(result.images) || !Number.isInteger(result.product_version)) throw new Error("Resposta de galeria inválida.");
        return result;
    }
    private write<T>(path: string, method: string, body: unknown, signal?: AbortSignal, fixedKey?: string): Promise<T> {
        const serialized = body instanceof Blob ? body : JSON.stringify(body);
        const fingerprint = `${method}:${path}:${typeof serialized === "string" ? serialized : "binary"}`;
        let key = fixedKey ?? this.keys.get(fingerprint);
        if (!key) { key = crypto.randomUUID(); this.keys.set(fingerprint, key); }
        const options = this.options(signal);
        return this.transport<T>(path, { ...options, method, body: serialized, headers: { ...options.headers, "Idempotency-Key": key, "Content-Type": body instanceof Blob ? "application/octet-stream" : "application/json" } }, false);
    }
    mutate(productId: string, gallery: ProductGallery, action: "primary" | "reorder" | "remove", value: string | string[], signal?: AbortSignal): Promise<ProductGallery> {
        const base = `/api/v1/admin/products/${encodeURIComponent(productId)}/images`;
        const path = action === "reorder" ? `${base}/reorder` : `${base}/${encodeURIComponent(value as string)}${action === "primary" ? "/set-primary" : ""}`;
        return this.write(path, action === "remove" ? "DELETE" : "POST", { expected_version: gallery.product_version, ...(action === "reorder" ? { image_ids: value } : {}) }, signal);
    }
    async resume(productId: string, job: ImageJob, signal: AbortSignal, notify: (phase: string) => void): Promise<ProductGallery> {
        const status = (phase: string) => { job.phase = phase; notify(phase); signal.throwIfAborted(); };
        let gallery = await this.gallery(productId, signal);
        if (gallery.images.some(image => image.file_id === job.intent?.file_id)) { job.attached = true; status("Associada"); return gallery; }
        if (job.terminal) throw new Error("Arquivo rejeitado ou expirado. Remova a seleção e escolha novamente para iniciar outra tentativa.");
        status("Criando intenção de upload");
        if (!job.intent) job.intent = await this.write<Intent>("/api/v1/files/upload-intents", "POST", { purpose: "PRODUCT_IMAGE", product_id: productId, size_bytes: job.file.size, mime_type: job.file.type, sha256: job.sha256 }, signal, job.keys.intent);
        const intent = job.intent;
        if (intent.product_id !== productId || !/^[0-9a-f-]{36}$/i.test(intent.file_id) || intent.upload_url !== `/api/v1/files/${intent.file_id}/content`) throw new Error("Destino de upload não autorizado.");
        if (job.file.size > intent.max_bytes || job.width * job.height > intent.max_pixels) { job.terminal = true; throw new Error("Imagem excede os limites configurados pela API."); }
        if (!job.uploaded) { status("Enviando arquivo"); await this.write(intent.upload_url, "PUT", job.file, signal, job.keys.upload); job.uploaded = true; }
        if (!job.confirmed) { status("Confirmando envio"); await this.write(`/api/v1/files/${intent.file_id}/confirm-upload`, "POST", undefined, signal, job.keys.confirm); job.confirmed = true; }
        status("Aguardando processamento");
        let available = false;
        for (let index = 0; index < 12; index++) {
            const file = await this.transport<FileStatus>(`/api/v1/files/${intent.file_id}`, this.options(signal));
            if (file.product_id !== productId || file.file_id !== intent.file_id) throw new Error("Arquivo diferente do solicitado.");
            if (file.status === "AVAILABLE") { available = true; break; }
            if (file.status === "REJECTED" || file.status === "EXPIRED") { job.terminal = true; status("Rejeitada ou expirada"); throw new Error(file.rejection_reason || "Arquivo rejeitado ou expirado pela API."); }
            await new Promise<void>((resolve, reject) => {
                const abort = () => { clearTimeout(timer); reject(new DOMException("Cancelado", "AbortError")); };
                const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, 1000);
                signal.addEventListener("abort", abort, { once: true });
                if (signal.aborted) abort();
            });
        }
        if (!available) throw new Error("Processamento ainda pendente. O produto foi preservado. Use Retomar envio; HTTP 202 não confirma a imagem.");
        gallery = await this.gallery(productId, signal);
        if (gallery.images.some(image => image.file_id === intent.file_id)) { job.attached = true; status("Associada"); return gallery; }
        status("Associando imagem");
        gallery = await this.write<ProductGallery>(`/api/v1/admin/products/${encodeURIComponent(productId)}/images`, "POST", { expected_version: gallery.product_version, file_id: intent.file_id, alt_text: "" }, signal);
        job.attached = true; status("Associada"); return gallery;
    }
}
export function imageOperationError(error: unknown): string {
    if (error instanceof ApiError) {
        if (error.code === "PRODUCT_IMAGE_LIMIT") return "Galeria cheia segundo o limite configurado pela API. Remova uma associação antes de adicionar outra imagem.";
        if (error.status === 409) return "Conflito de versão ou estado da imagem. Atualize a galeria antes de tentar novamente. A mesma tentativa preserva sua chave de idempotência.";
        if (error.status === 401) return "Sessão expirada. Entre novamente.";
        if (error.status === 403) return "Sem autorização para gerenciar imagens deste produto.";
        if (error.status === 413 || error.status === 422) return "Arquivo ou metadados recusados pela API. Revise o formato, tamanho e integridade.";
        if (error.status === 429) return "Limite de uploads atingido. Aguarde antes de retomar.";
    }
    return error instanceof Error ? error.message : "Não foi possível confirmar a operação. Atualize a galeria antes de repetir.";
}
