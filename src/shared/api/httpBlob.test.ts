import { afterEach, expect, test, vi } from "vitest";
import { ApiError, requestBlob } from "./http";
afterEach(() => vi.unstubAllGlobals());
const path = "/api/v1/products/11111111-1111-4111-8111-111111111111/images/22222222-2222-4222-8222-222222222222/content";
test("binary reads forbid redirects and accept only PNG/JPEG", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("png", { headers: { "Content-Type": "image/png" } }));
    vi.stubGlobal("fetch", fetcher);
    expect((await requestBlob(path)).type).toBe("image/png");
    expect(fetcher.mock.calls[0][1]).toMatchObject({ method: "GET", redirect: "error", cache: "no-store" });
    fetcher.mockResolvedValue(new Response("<svg/>", { headers: { "Content-Type": "image/svg+xml" } }));
    await expect(requestBlob(path)).rejects.toThrow("não autorizado");
});
test.each(["https://evil.invalid/x", "//evil.invalid/x", `${path}?token=x`, "/api/v1/products/../auth/login", `${path}/../../`])("rejects untrusted path before any fetch: %s", async url => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect(() => requestBlob(url)).toThrow("não autorizado"); expect(fetcher).not.toHaveBeenCalled();
});
test("preserves HTTP authorization failures and abort errors", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "CAPABILITY_REQUIRED" } }), { status: 403 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(requestBlob(path)).rejects.toMatchObject({ status: 403, code: "CAPABILITY_REQUIRED" } satisfies Partial<ApiError>);
    const controller = new AbortController(); controller.abort();
    fetcher.mockRejectedValue(new DOMException("Cancelled", "AbortError"));
    await expect(requestBlob(path, { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
});
