import { cleanup, render, screen, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AuthenticatedProductImage } from "./AuthenticatedProductImage";
import { AuthContext, type AuthContextValue } from "../../features/auth/context/AuthContext";
import type { CanonicalProductImage } from "../api/productImageTypes";

const mocks = vi.hoisted(() => ({ download: vi.fn(), listeners: new Set<() => void>() }));
vi.mock("../../features/services/apiAuth.service", () => ({
    authenticatedBlobRequest: mocks.download,
    subscribeSessionExpired: (listener: () => void) => { mocks.listeners.add(listener); return () => { mocks.listeners.delete(listener); }; },
}));
const productId = "11111111-1111-4111-8111-111111111111";
const image: CanonicalProductImage = { id: "22222222-2222-4222-8222-222222222222", file_id: "file", position: 0, is_primary: true, alt_text: "Embalagem oficial", mime_type: "image/png", size_bytes: 10, sha256: "hash", width: 1, height: 1, requires_authentication: true, content_url: `/api/v1/products/${productId}/images/22222222-2222-4222-8222-222222222222/content` };
function context(organization = "org"): AuthContextValue {
    return { user: { id: "user", organization_id: organization, name: "Teste", email: "test@example.invalid", role: "BUYER_ADMIN" }, isAuthenticated: true, isLoading: false, sessionError: "", sessionNotice: "", login: vi.fn(), logout: vi.fn() };
}
const view = (organization = "org", selected: CanonicalProductImage | null = image) => <AuthContext.Provider value={context(organization)}><AuthenticatedProductImage productId={productId} image={selected} name="Produto"/></AuthContext.Provider>;
beforeEach(() => {
    mocks.download.mockReset().mockResolvedValue(new Blob(["png"], { type: "image/png" }));
    mocks.listeners.clear();
    URL.createObjectURL = vi.fn().mockReturnValueOnce("blob:first").mockReturnValue("blob:next");
    URL.revokeObjectURL = vi.fn();
    vi.stubGlobal("IntersectionObserver", undefined);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
test("downloads with organization, uses backend alt text and revokes on unmount", async () => {
    const { unmount } = render(view());
    expect((await screen.findByAltText("Embalagem oficial")).getAttribute("src")).toBe("blob:first");
    expect(mocks.download).toHaveBeenCalledWith(image.content_url, "org", expect.any(AbortSignal));
    unmount(); expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:first");
    expect(mocks.download.mock.calls[0][2].aborted).toBe(true);
});
test("absence, untrusted URL and download failure preserve the placeholder", async () => {
    const { rerender } = render(view("org", null));
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("não disponível");
    rerender(view("org", { ...image, content_url: "https://evil.invalid/image.png" }));
    expect(mocks.download).not.toHaveBeenCalled();
    mocks.download.mockRejectedValueOnce(new Error("Network"));
    rerender(view());
    await waitFor(() => expect(mocks.download).toHaveBeenCalledTimes(1));
    expect(URL.createObjectURL).not.toHaveBeenCalled();
});
test("organization changes hide old pixels, cancel old request and revoke its URL", async () => {
    const { rerender } = render(view());
    await screen.findByAltText("Embalagem oficial");
    rerender(view("other"));
    expect(screen.queryByAltText("Embalagem oficial")).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:first");
    await screen.findByAltText("Embalagem oficial");
    expect(mocks.download).toHaveBeenLastCalledWith(image.content_url, "other", expect.any(AbortSignal));
});
test("session expiration immediately disposes the image", async () => {
    render(view()); await screen.findByAltText("Embalagem oficial");
    act(() => { for (const listener of mocks.listeners) listener(); });
    expect(screen.queryByAltText("Embalagem oficial")).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:first");
});
test("a late response after cancellation never creates an object URL", async () => {
    let resolve!: (blob: Blob) => void;
    mocks.download.mockImplementation(() => new Promise<Blob>(done => { resolve = done; }));
    const { unmount } = render(view()); unmount();
    await act(async () => { resolve(new Blob(["png"])); });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
});
test("list images wait for intersection", async () => {
    let notify!: IntersectionObserverCallback;
    const disconnect = vi.fn();
    vi.stubGlobal("IntersectionObserver", class { constructor(callback: IntersectionObserverCallback) { notify = callback; } observe() {} disconnect = disconnect; });
    render(view()); expect(mocks.download).not.toHaveBeenCalled();
    act(() => notify([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    await screen.findByAltText("Embalagem oficial");
    expect(disconnect).toHaveBeenCalled();
});
