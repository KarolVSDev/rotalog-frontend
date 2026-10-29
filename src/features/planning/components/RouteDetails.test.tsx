import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { RouteDetails } from "./RouteDetails";
import { RouteManifest } from "./RouteManifest";
import { PlanningRepository } from "../api/planningRepository";
import { manifestFixture, routeFixture, trackingFixture } from "../../../../tests/fixtures/planning";

beforeEach(() => {
    vi.spyOn(PlanningRepository.prototype, "trackingCurrent").mockResolvedValue(trackingFixture);
    vi.spyOn(PlanningRepository.prototype, "trackingHistory").mockResolvedValue({ route_id: "test-route", items: [], next_cursor: null, is_synthetic: true });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
test("orders stops and keeps route visible when manifest fails, with independent retry", async () => {
    const repository = new PlanningRepository("org");
    const detail = vi.spyOn(repository, "detail").mockResolvedValue(routeFixture);
    const manifest = vi.spyOn(repository, "manifest").mockRejectedValueOnce(new Error("Falha de rede")).mockResolvedValue(manifestFixture);
    const close = vi.fn();
    render(<RouteDetails id="test-route" repository={repository} onClose={close}/>);
    expect(await screen.findByRole("heading", { name: "R-TEST" })).toBeTruthy();
    const stops = within(screen.getByRole("list", { name: "Paradas em ordem" })).getAllByRole("listitem");
    expect(stops[0].textContent).toContain("Sequência 0");
    expect(stops[1].textContent).toContain("Destino sintético");
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("Manifesto indisponível"));
    fireEvent.click(screen.getByRole("button", { name: "Tentar carregar manifesto novamente" }));
    expect(await screen.findByText("Carga ainda não conferida")).toBeTruthy();
    expect(detail).toHaveBeenCalledTimes(2); // Details and operational state in tracking.
    expect(manifest).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: /Voltar à listagem/ }));
    expect(close).toHaveBeenCalledOnce();
});
test("valid conference and pending issues are distinct from an unchecked manifest", async () => {
    const repository = new PlanningRepository("org");
    vi.spyOn(repository, "manifest").mockResolvedValue({ ...manifestFixture, declaration_valid: true, checked_at: "2026-10-29T12:00:00Z" });
    render(<RouteManifest id="test-route" repository={repository}/>);
    expect(await screen.findByText("Conferência válida")).toBeTruthy();
    expect(screen.queryByText("Carga ainda não conferida")).toBeNull();
});
