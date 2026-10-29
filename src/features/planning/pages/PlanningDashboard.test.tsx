import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { PlanningDashboard } from "./PlanningDashboard";
import type { RoutesPage } from "../api/planningTypes";

const mocks = vi.hoisted(() => ({ list: vi.fn(), allowed: true }));
vi.mock("../../auth/hooks/useAuth", () => ({ useAuth: () => ({ user: {
    id: "planner", organization_id: "org", role: "ROUTE_PLANNER",
    organizations: [{ id: "org", role: "ROUTE_PLANNER" }], capabilities: ["route:plan"],
} }) }));
vi.mock("../../services/apiAuth.service", () => ({ plannerAuthorized: () => mocks.allowed }));
vi.mock("../api/planningRepository", async importOriginal => ({
    ...await importOriginal<typeof import("../api/planningRepository")>(),
    PlanningRepository: class { list = mocks.list; },
}));
const empty: RoutesPage = { items: [], total: 0, page: 1, page_size: 25, is_synthetic: true, label: "SIMULAÇÃO" };
beforeEach(() => { mocks.list.mockReset().mockResolvedValue(empty); mocks.allowed = true; });
afterEach(cleanup);
test("loads real totals, not page length, and resets pagination when filtering", async () => {
    mocks.list.mockImplementation(async (page: number) => ({ ...empty, total: 87, page }));
    render(<PlanningDashboard />);
    expect(await screen.findByText("87")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(2, { page: 2, state: "", active: "" }, expect.any(AbortSignal)));
    fireEvent.change(screen.getByLabelText("Estado operacional"), { target: { value: "STARTED" } });
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(1, { page: 1, state: "STARTED", active: "" }, expect.any(AbortSignal)));
});
test("ignores late responses from superseded filters", async () => {
    let resolveOld!: (data: RoutesPage) => void;
    mocks.list.mockImplementationOnce(() => new Promise<RoutesPage>(resolve => { resolveOld = resolve; }))
        .mockResolvedValue({ ...empty, total: 2 });
    render(<PlanningDashboard />);
    fireEvent.change(screen.getByLabelText("Atividade"), { target: { value: "true" } });
    expect(await screen.findByText("2")).toBeTruthy();
    resolveOld({ ...empty, total: 999 });
    await waitFor(() => expect(screen.queryByText("999")).toBeNull());
});
test("shows loading, errors, retry and an empty result without stale totals", async () => {
    mocks.list.mockRejectedValueOnce(new Error("Falha de rede"));
    render(<PlanningDashboard />);
    expect(screen.getByText("Consultando rotas…")).toBeTruthy();
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("Falha de rede"));
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("Nenhuma rota encontrada")).toBeTruthy();
});
test("does not fetch when the active membership is unauthorized", () => {
    mocks.allowed = false;
    render(<PlanningDashboard />);
    expect(screen.getByRole("alert").textContent).toContain("Acesso não autorizado");
    expect(mocks.list).not.toHaveBeenCalled();
});
