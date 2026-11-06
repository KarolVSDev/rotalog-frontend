import { afterEach, expect, test, vi } from "vitest";
import { ProductImagesRepository, prepareImage, imageOperationError, type ImageJob, type ProductGallery } from "./productImagesRepository";
import { ApiError } from "../../../shared/api/http";
const fileId = "22222222-2222-4222-8222-222222222222";
const empty: ProductGallery = { product_id: "product", product_version: 1, images: [], primary_image_id: null, is_synthetic: true };
const intent = { file_id: fileId, product_id: "product", status: "PENDING_UPLOAD", upload_url: `/api/v1/files/${fileId}/content`, max_bytes: 8388608, max_pixels: 16000000 };
function job(): ImageJob { return { id: "job", file: new File(["bytes"], "test.png", { type: "image/png" }), width: 1, height: 1, sha256: "a".repeat(64), phase: "Selecionada", keys: { intent: "intent-key", upload: "upload-key", confirm: "confirm-key" } }; }
function transport() {
    return vi.fn().mockImplementation(async (path: string, options?: RequestInit) => {
        if (path.endsWith("/upload-intents")) return intent;
        if (path.endsWith("/confirm-upload")) return { ...intent, status: "QUARANTINED" };
        if (path.endsWith("/content")) return undefined;
        if (path === `/api/v1/files/${fileId}`) return { ...intent, status: "AVAILABLE" };
        if (options?.method === "POST") return { ...empty, product_version: 2 };
        return empty;
    });
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
test("upload follows intent, binary PUT, confirmation, AVAILABLE and versioned attachment", async () => {
    const send = transport(); const item = job();
    const result = await new ProductImagesRepository("org", send).resume("product", item, new AbortController().signal, vi.fn());
    expect(result.product_version).toBe(2); expect(item.attached).toBe(true);
    const writes = send.mock.calls.filter(call => call[1]?.method);
    expect(writes.map(call => call[1]?.method)).toEqual(["POST", "PUT", "POST", "POST"]);
    expect(writes.every(call => call[2] === false)).toBe(true);
    expect(JSON.parse(writes.at(-1)![1].body as string)).toMatchObject({ expected_version: 1, file_id: fileId });
    expect(writes[1][1].body).toBe(item.file);
});
test("transport failure resumes with the same intent key and never recreates the product", async () => {
    const send = transport(); const normal = send.getMockImplementation()!; let fail = true;
    send.mockImplementation(async (path, options) => { if (path.endsWith("upload-intents") && fail) { fail = false; throw new Error("Network"); } return normal(path, options); });
    const repository = new ProductImagesRepository("org", send), item = job();
    await expect(repository.resume("product", item, new AbortController().signal, vi.fn())).rejects.toThrow("Network");
    await repository.resume("product", item, new AbortController().signal, vi.fn());
    const intents = send.mock.calls.filter(call => call[0].endsWith("upload-intents"));
    expect(intents[0][1].headers).toEqual(intents[1][1].headers);
    expect(send.mock.calls.some(call => call[0] === "/api/v1/admin/products")).toBe(false);
});
test("202 is not AVAILABLE and processing timeout keeps a resumable file", async () => {
    vi.useFakeTimers(); const send = transport(); const normal = send.getMockImplementation()!;
    send.mockImplementation(async (path, options) => path === `/api/v1/files/${fileId}` ? { ...intent, status: "SCANNING" } : normal(path, options));
    const item = job(); const promise = expect(new ProductImagesRepository("org", send).resume("product", item, new AbortController().signal, vi.fn())).rejects.toThrow("pendente");
    await vi.runAllTimersAsync(); await promise;
    expect(item.confirmed).toBe(true); expect(item.attached).not.toBe(true);
    expect(send.mock.calls.some(call => call[0] === "/api/v1/admin/products/product/images")).toBe(false);
});
test("rejection and unsafe destinations never attach or upload externally", async () => {
    const send = transport(); const normal = send.getMockImplementation()!;
    send.mockImplementation(async (path, options) => path === `/api/v1/files/${fileId}` ? { ...intent, status: "REJECTED", rejection_reason: "Imagem inválida" } : normal(path, options));
    const item = job(); await expect(new ProductImagesRepository("org", send).resume("product", item, new AbortController().signal, vi.fn())).rejects.toThrow("inválida");
    expect(item.terminal).toBe(true);
    const unsafe = vi.fn().mockImplementation(async path => path.endsWith("upload-intents") ? { ...intent, upload_url: "https://evil.invalid/upload" } : empty);
    await expect(new ProductImagesRepository("org", unsafe).resume("product", job(), new AbortController().signal, vi.fn())).rejects.toThrow("não autorizado");
    expect(unsafe.mock.calls.some(call => call[0].startsWith("https"))).toBe(false);
});
test("gallery mutations preserve versions, keys and logical deletion", async () => {
    const send = vi.fn().mockResolvedValue(empty), repository = new ProductImagesRepository("org", send);
    await repository.mutate("product", empty, "remove", "image");
    await repository.mutate("product", empty, "remove", "image");
    expect(send.mock.calls[0]).toEqual(send.mock.calls[1]);
    expect(send.mock.calls[0][1].method).toBe("DELETE");
    expect(JSON.parse(send.mock.calls[0][1].body)).toEqual({ expected_version: 1 });
    expect(imageOperationError(new ApiError(409, { code: "PRODUCT_IMAGE_LIMIT" }))).toContain("Galeria cheia");
});
test("rejects invalid MIME, empty and oversized images before decoding", async () => {
    await expect(prepareImage(new File(["svg"], "test.svg", { type: "image/svg+xml" }))).rejects.toThrow("PNG");
    await expect(prepareImage(new File([], "empty.png", { type: "image/png" }))).rejects.toThrow("PNG");
    await expect(prepareImage({ type: "image/png", size: 8388609 } as File)).rejects.toThrow("8 MiB");
});

test("validates signatures, decoding and pixel limits before upload", async () => {
    await expect(prepareImage(new File(["not png"], "bad.png", { type: "image/png" }))).rejects.toThrow("bytes");
    const file = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "image.png", { type: "image/png" });
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("corrupt")));
    await expect(prepareImage(file)).rejects.toThrow("decodificar");
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 5000, height: 5000, close }));
    await expect(prepareImage(file)).rejects.toThrow("megapixels"); expect(close).toHaveBeenCalledOnce();
});

test("cancelled processing cannot attach and aborts the waiting timer", async () => {
    vi.useFakeTimers(); const send = transport(); const normal = send.getMockImplementation()!;
    send.mockImplementation(async (path, options) => path === `/api/v1/files/${fileId}` ? { ...intent, status: "SCANNING" } : normal(path, options));
    const controller = new AbortController();
    const promise = expect(new ProductImagesRepository("org", send).resume("product", job(), controller.signal, vi.fn())).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(1); controller.abort(); await promise;
    expect(send.mock.calls.some(call => call[0] === "/api/v1/admin/products/product/images")).toBe(false);
});

test("401 and 403 preserve shared session errors without replaying writes", async () => {
    for (const status of [401, 403]) {
        const send = vi.fn().mockImplementation(async path => { if (path.endsWith("upload-intents")) throw new ApiError(status, { code: "UNAUTHORIZED" }); return empty; });
        await expect(new ProductImagesRepository("org", send).resume("product", job(), new AbortController().signal, vi.fn())).rejects.toMatchObject({ status });
        expect(send.mock.calls.filter(call => call[0].endsWith("upload-intents"))).toHaveLength(1);
        expect(imageOperationError(new ApiError(status, { code: "UNAUTHORIZED" }))).toContain(status === 401 ? "Sessão expirada" : "Sem autorização");
    }
});
