import type { EligibleCargo, ManualPlan, RoutePlan } from "../../src/features/planning/api/planTypes";
export const planId = "11111111-1111-4111-8111-111111111111";
export const manualPlanFixture: ManualPlan = { warehouse_id: "warehouse", fulfillment_ids: ["load"], driver_id: "driver", vehicle_id: "vehicle", reason: "Proposta sintética de teste", deliveries: [{ supplier_order_id: "order", address: "Destino sintético de teste", latitude: "-3.100000", longitude: "-60.000000", starts_at: "2099-11-03T12:00:00Z", ends_at: "2099-11-03T16:00:00Z", time_zone: "America/Manaus", service_seconds: 300 }] };
export const planFixture: RoutePlan = { id: planId, state: "PROPOSED", version: 1, reason: manualPlanFixture.reason, snapshot: manualPlanFixture, is_synthetic: true };
export const cargoFixture: EligibleCargo = { organizationId: "org", warehouseId: "warehouse", fulfillmentIds: ["load"], orderIds: ["order"] };
