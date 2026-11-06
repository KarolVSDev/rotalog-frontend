import type { CanonicalRoute, CargoManifest, RouteTracking, TrackingPoint } from "../../src/features/planning/api/planningTypes";

export const pointFixture: TrackingPoint = { id: "point-1", device_id: "test-device", sequence_no: 1,
    captured_at_device: "2026-10-29T12:00:00Z", received_at_server: "2026-10-29T12:01:00Z",
    latitude: "-3.100000", longitude: "-60.000000", accuracy_meters: "10.00", speed_mps: null,
    bearing_degrees: null, is_mocked_by_os: false, flags: [] };
export const trackingFixture: RouteTracking = { route_id: "test-route", state: "NOT_STARTED", is_stale: true,
    position: null, operational_version: 1, is_synthetic: true };

export const manifestFixture: CargoManifest = {
    route_id: "test-route", route_version: 1, manifest_version: 1, fingerprint: "synthetic",
    inspection_required: false, requires_replanning: false, declaration_valid: false,
    checked_at: null, received_at: null, read_only: true, unresolved_issues: 0, total_sellable_packages: 3,
    is_synthetic: true, issues: [], lines: [{ id: "line", fulfillment_line_id: "load-line", fulfillment_id: "load",
        order_item_id: "item", supplier_order_id: "order", product_id: "product", product_name: "Produto sintético de teste",
        brand: "Marca teste", packaging_type: "Pacote", packaging_quantity: 1, net_content: 400, net_content_unit: "g",
        quantity_unit: "SELLABLE_PACKAGE", expected_quantity: 3, dispatched_quantity: 0 }],
};
export const routeFixture: CanonicalRoute = {
    id: "test-route", code: "R-TEST", state: "PUBLISHED", version: 1, driver_id: "test-driver",
    vehicle_id: "test-vehicle", warehouse_id: "test-warehouse", plan_version_id: "test-plan",
    updated_at: "2026-10-29T12:00:00Z", is_synthetic: true, scheduled_date: "2026-11-03",
    vehicle: { id: "test-vehicle", registration: "DEMO-TEST", package_units: 100, weight_grams: 100000, volume_cm3: 100000 },
    cargo: manifestFixture, allowed_actions: [], stops: [
        { id: "delivery", sequence: 1, kind: "DELIVERY", state: "PENDING", supplier_order_id: "order",
            address_snapshot: { address: "Destino sintético de teste", starts_at: "2026-11-03T12:00:00Z", ends_at: "2026-11-03T16:00:00Z", instructions: "Instrução sintética" },
            attempt_id: null, attempt_state: null, attempt_version: null, items: manifestFixture.lines },
        { id: "pickup", sequence: 0, kind: "PICKUP", state: "PENDING", supplier_order_id: null,
            address_snapshot: { address: "Origem sintética de teste" }, attempt_id: null, attempt_state: null, attempt_version: null, items: [] },
    ],
};
