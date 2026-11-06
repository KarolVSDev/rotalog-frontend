import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { PlanWorkflow } from "./PlanWorkflow";
import { PlanningRepository } from "../api/planningRepository";
import { cargoFixture, manualPlanFixture, planFixture } from "../../../../tests/fixtures/route-plan";
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
test("existing proposed plan cannot be approved without authorized cargo", () => {
    const repository = new PlanningRepository("org");
    const approve = vi.spyOn(repository, "approvePlan");
    render(<PlanWorkflow repository={repository} organizationId="org" initialPlan={planFixture} eligibility={null} onPublished={vi.fn()}/>);
    const button = screen.getByRole("button", { name: "Aprovar proposta" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button); expect(approve).not.toHaveBeenCalled();
});
test("an uncertain create repeats the same key and payload, without automatic retry", async () => {
    const repository = new PlanningRepository("org");
    const create = vi.spyOn(repository, "createPlan").mockRejectedValueOnce(new Error("Network")).mockResolvedValue(planFixture);
    render(<PlanWorkflow repository={repository} organizationId="org" draft={manualPlanFixture} eligibility={cargoFixture} onPublished={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button", { name: "Criar proposta" }));
    await screen.findByRole("alert");
    expect(create).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Repetir tentativa de criação" }));
    await screen.findByRole("button", { name: "Aprovar proposta" });
    expect(create.mock.calls[0]).toEqual(create.mock.calls[1]);
});
