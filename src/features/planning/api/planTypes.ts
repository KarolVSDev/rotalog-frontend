export type Driver = { id: string; name: string; is_synthetic: true };
export type Vehicle = { id: string; registration: string; package_units: number; weight_grams: number; volume_cm3: number; is_synthetic: true };
export type Destination = { supplier_order_id: string; address: string; latitude: string; longitude: string;
    starts_at: string; ends_at: string; time_zone: "America/Manaus"; service_seconds: number };
export type ManualPlan = { warehouse_id: string; fulfillment_ids: string[]; driver_id: string; vehicle_id: string; reason: string; deliveries: Destination[] };
export type RoutePlan = { id: string; state: string; version: number; snapshot: Partial<ManualPlan> & Record<string, unknown>; reason: string; is_synthetic: true };
// Future authorized cargo source. No production implementation exists in this increment.
export type EligibleCargo = { organizationId: string; warehouseId: string; fulfillmentIds: string[]; orderIds: string[] };
