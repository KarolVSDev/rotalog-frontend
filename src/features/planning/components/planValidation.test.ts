import { expect, test } from "vitest";
import { cargoMatches, destinationPayload, validateDraft, type DestinationDraft } from "./planValidation";
import { cargoFixture, manualPlanFixture } from "../../../../tests/fixtures/route-plan";
const destination: DestinationDraft = { address: "Destino de teste", latitude: "-3.100000", longitude: "-60.000000", starts: "2099-11-03T08:00", ends: "2099-11-03T12:00", service: "300" };
test("validates draft and converts Manaus time independently of the browser timezone", () => {
    expect(() => validateDraft("driver", "vehicle", "Justificativa teste", [destination])).not.toThrow();
    expect(destinationPayload(destination, "order").starts_at).toBe("2099-11-03T12:00:00.000Z");
});
test.each([{ latitude: "91" }, { longitude: "" }, { latitude: "-3.1234567" }, { service: "0" }, { ends: "2099-11-03T07:00" }, { address: "abc" }])("rejects invalid delivery %j", invalid => {
    expect(() => validateDraft("d", "v", "Motivo teste", [{ ...destination, ...invalid }])).toThrow("Entrega 1");
});
test("requires real cargo context and prevents cross-organization or invented loads", () => {
    expect(cargoMatches(manualPlanFixture, null, "org")).toBe(false);
    expect(cargoMatches(manualPlanFixture, cargoFixture, "other")).toBe(false);
    expect(cargoMatches({ ...manualPlanFixture, fulfillment_ids: ["other"] }, cargoFixture, "org")).toBe(false);
    expect(cargoMatches(manualPlanFixture, cargoFixture, "org")).toBe(true);
});
test("validates assignment, justification and chronological service windows", () => {
    expect(() => validateDraft("", "v", "Motivo teste", [destination])).toThrow("motorista");
    expect(() => validateDraft("d", "v", "abc", [destination])).toThrow("justificativa");
    expect(() => validateDraft("d", "v", "Motivo teste", [destination, { ...destination, starts: "2099-11-02T08:00", ends: "2099-11-02T12:00" }])).toThrow("sequência");
});
