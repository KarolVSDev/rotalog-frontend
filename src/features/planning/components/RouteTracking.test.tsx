import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { RouteTracking } from "./RouteTracking";
import { chronologicalPoints } from "./planningPresentation";
import { PlanningRepository } from "../api/planningRepository";
import { pointFixture, routeFixture, trackingFixture } from "../../../../tests/fixtures/planning";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function setup() {
    const repository = new PlanningRepository("org");
    const current = vi.spyOn(repository, "trackingCurrent").mockResolvedValue(trackingFixture);
    const detail = vi.spyOn(repository, "detail").mockResolvedValue(routeFixture);
    const history = vi.spyOn(repository, "trackingHistory").mockResolvedValue({ route_id: "test-route", items: [], next_cursor: null, is_synthetic: true });
    return { repository, current, detail, history };
}
test("null position and empty history do not invent coordinates", async () => {
    const { repository } = setup();
    render(<RouteTracking route={routeFixture} repository={repository}/>);
    expect(await screen.findByText("Nenhuma localização registrada para esta rota.")).toBeTruthy();
    expect(await screen.findByText("Histórico sem posições registradas.")).toBeTruthy();
    expect(screen.queryByText("Latitude")).toBeNull();
});
test("refresh reads the current position and operational state without timers", async () => {
    const { repository, current, detail } = setup();
    current.mockResolvedValueOnce(trackingFixture).mockResolvedValue({ ...trackingFixture, state: "STALE", position: pointFixture });
    render(<RouteTracking route={routeFixture} repository={repository}/>);
    await screen.findByText("Histórico sem posições registradas.");
    fireEvent.click(screen.getByRole("button", { name: "Atualizar rastreamento" }));
    expect(await screen.findByText("-3.100000")).toBeTruthy();
    expect(screen.getByText("29/10/2026, 08:00")).toBeTruthy();
    expect(current).toHaveBeenCalledTimes(2);
    expect(detail).toHaveBeenCalledTimes(2);
});
test("history failure is independent and cursor pages merge in capture order", async () => {
    const { repository, current, history } = setup();
    current.mockRejectedValue(new Error("Falha na posição atual"));
    history.mockResolvedValueOnce({ route_id: "test-route", items: [{ ...pointFixture, id: "later", captured_at_device: "2026-10-29T14:00:00Z" }], next_cursor: "next", is_synthetic: true })
        .mockRejectedValueOnce(new Error("Falha no histórico"))
        .mockResolvedValue({ route_id: "test-route", items: [pointFixture], next_cursor: null, is_synthetic: true });
    render(<RouteTracking route={routeFixture} repository={repository}/>);
    fireEvent.click(await screen.findByRole("button", { name: "Carregar mais posições" }));
    expect(await screen.findByText("Falha no histórico")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tentar histórico novamente" }));
    await screen.findByText("2 posição(ões) carregada(s)");
    const positions = within(screen.getByRole("list", { name: "Posições em ordem cronológica" })).getAllByRole("listitem");
    expect(positions[0].textContent).toContain("08:00");
    expect(positions[1].textContent).toContain("10:00");
    expect(current).toHaveBeenCalledTimes(1);
});
test("capture order handles offsets and deduplicates point IDs without mutating input", () => {
    const points = [pointFixture, { ...pointFixture, id: "earlier", captured_at_device: "2026-10-29T07:00:00-04:00" }, pointFixture];
    expect(chronologicalPoints(points).map(p => p.id)).toEqual(["earlier", "point-1"]);
    expect(points).toHaveLength(3);
});
