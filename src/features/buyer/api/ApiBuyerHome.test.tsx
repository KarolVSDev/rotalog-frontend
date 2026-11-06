import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext, type AuthContextValue } from "../../auth/context/AuthContext";
import { ApiBuyerHome } from "./ApiBuyerHome";
import { defaultUserPath } from "../../../app/routePermissions";

vi.mock("./BuyerPages", () => ({ ApiBuyerCatalog: () => <p>Catálogo comprador</p> }));
const planner = {
    id: "planner", name: "Planejador", email: "planner@example.invalid", role: "ROUTE_PLANNER" as const,
    organization_id: "org", organizations: [{ id: "org", name: "Organização", role: "ROUTE_PLANNER" as const }],
    capabilities: ["route:plan", "route:publish", "fleet:manage"],
};
afterEach(cleanup);
function home(user: AuthContextValue["user"], isLoading = false) {
    const value: AuthContextValue = { user, isLoading, isAuthenticated: !!user, sessionError: "", sessionNotice: "", login: vi.fn(), logout: vi.fn() };
    render(<AuthContext.Provider value={value}><MemoryRouter initialEntries={["/"]}><Routes>
        <Route path="/" element={<ApiBuyerHome />} />
        <Route path="/fornecedor/planejamento" element={<p>Destino planejamento</p>} />
        <Route path="/login" element={<p>Destino login</p>} />
    </Routes></MemoryRouter></AuthContext.Provider>);
}
test("authenticated planner opening root follows the central planning destination", async () => {
    expect(defaultUserPath(planner)).toBe("/fornecedor/planejamento");
    home(planner);
    expect(await screen.findByText("Destino planejamento")).toBeTruthy();
    expect(screen.queryByText("Catálogo comprador")).toBeNull();
});
test("root does not grant planning when the active context lacks authorization", async () => {
    home({ ...planner, organization_id: "other" });
    expect(await screen.findByText("Destino login")).toBeTruthy();
    expect(screen.queryByText("Destino planejamento")).toBeNull();
});
test("root waits for restoration before redirecting the planner", () => {
    home(planner, true);
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.queryByText("Destino planejamento")).toBeNull();
});
