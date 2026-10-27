import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext, type AuthContextValue } from "../context/AuthContext";
import { Login } from "./Login";

vi.mock("../../../shared/api/config", () => ({ authMode: "mock", apiUrl: "http://localhost:8000" }));
afterEach(cleanup);

test("mock buyer submitting login without a return path navigates to purchases", async () => {
    const buyer = { id: "mock-buyer", name: "Comprador", email: "buyer@example.invalid", role: "BUYER_ADMIN" as const };
    const login = vi.fn().mockResolvedValue(buyer);
    const context: AuthContextValue = { user: null, isAuthenticated: false, isLoading: false, sessionError: "", sessionNotice: "", login, logout: vi.fn() };
    render(<AuthContext.Provider value={context}><MemoryRouter initialEntries={["/login"]}><Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/comprador/compras" element={<p>Destino compras</p>} />
        <Route path="/" element={<p>Destino catálogo</p>} />
    </Routes></MemoryRouter></AuthContext.Provider>);
    fireEvent.change(screen.getByLabelText("E-mail", { exact: true }), { target: { value: buyer.email } });
    fireEvent.change(screen.getByLabelText("Senha", { exact: true }), { target: { value: "synthetic-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("Destino compras")).toBeTruthy();
    expect(login).toHaveBeenCalledOnce();
    expect(screen.queryByText("Destino catálogo")).toBeNull();
});
