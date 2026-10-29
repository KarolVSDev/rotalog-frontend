import { expect, test } from "vitest";
import { validateEnvironment } from "./environment";

test("deploy requires explicit API mode and URL", () => {
    expect(() => validateEnvironment({}, true)).toThrow("VITE_AUTH_MODE=api");
    expect(() => validateEnvironment({ VITE_AUTH_MODE: "mock" }, true)).toThrow("somente no desenvolvimento");
    expect(() => validateEnvironment({ VITE_AUTH_MODE: "api" }, true)).toThrow("VITE_API_URL");
});
test.each(["localhost:8000", "/api", "ftp://localhost", "https://user:password@localhost", "https://localhost?token=secret", "https://localhost#fragment", " https://localhost", "invalid"])('rejects invalid API URL %s', url => {
    expect(() => validateEnvironment({ VITE_AUTH_MODE: "api", VITE_API_URL: url }, true)).toThrow("VITE_API_URL");
});
test("development supports intentional mock and requires a URL for API", () => {
    expect(validateEnvironment({ VITE_AUTH_MODE: "mock" }, false)).toEqual({ authMode: "mock", apiUrl: "" });
    expect(validateEnvironment({}, false).authMode).toBe("mock");
    expect(() => validateEnvironment({ VITE_AUTH_MODE: "api" }, false)).toThrow("VITE_API_URL");
    expect(() => validateEnvironment({ VITE_AUTH_MODE: "other" }, false)).toThrow("mock ou api");
});
test("explicit local API configuration remains usable without fallback", () => {
    expect(validateEnvironment({ VITE_AUTH_MODE: "api", VITE_API_URL: "http://localhost:8000/" }, true)).toEqual({ authMode: "api", apiUrl: "http://localhost:8000" });
});
