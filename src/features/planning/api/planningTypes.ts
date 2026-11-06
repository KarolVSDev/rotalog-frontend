// Backend: logistics/delivery_schemas.py, cargo_schemas.py and tracking_schemas.py.
export const routeStates = {
    PUBLISHED: "Publicada", ACCEPTED: "Aceita", PICKUP_IN_PROGRESS: "Coleta em andamento",
    READY_TO_START: "Pronta para iniciar", STARTED: "Em andamento", EXECUTION_ENDED: "Deslocamento encerrado",
    OPERATIONALLY_COMPLETED: "Operação concluída", CANCELLED: "Cancelada",
} as const;
export type RouteState = keyof typeof routeStates;
export type RouteFilters = { state: RouteState | ""; active: "" | "true" | "false" };
export type ManifestLine = {
    id: string; fulfillment_line_id: string; fulfillment_id: string; order_item_id: string;
    supplier_order_id: string; product_id: string; product_name: string; brand: string | null;
    packaging_type: string | null; packaging_quantity: number | null; net_content: number | null;
    net_content_unit: string | null; quantity_unit: "SELLABLE_PACKAGE";
    expected_quantity: number; dispatched_quantity: number;
};
export type RouteStop = {
    id: string; supplier_order_id: string | null; sequence: number; kind: string; state: string;
    address_snapshot: Record<string, unknown>; attempt_id: string | null;
    attempt_state: string | null; attempt_version: number | null; items: ManifestLine[];
};
export type CargoSummary = {
    route_id: string; route_version: number; manifest_version: number; fingerprint: string;
    inspection_required: boolean; requires_replanning: boolean; declaration_valid: boolean;
    checked_at: string | null; received_at: string | null; read_only: boolean;
    unresolved_issues: number; total_sellable_packages: number; is_synthetic: true;
};
export type TrackingPoint = {
    id: string; device_id: string; sequence_no: number; captured_at_device: string; received_at_server: string;
    latitude: string; longitude: string; accuracy_meters: string; speed_mps: string | null;
    bearing_degrees: string | null; is_mocked_by_os: boolean; flags: string[];
};
export type RouteTracking = {
    route_id: string; state: "NOT_STARTED" | "ACTIVE" | "DEGRADED_OFFLINE" | "DEGRADED_PERMISSION" | "STALE" | "ENDED";
    is_stale: boolean; position: TrackingPoint | null; operational_version: number; is_synthetic: true;
};
export type TrackingHistory = { route_id: string; items: TrackingPoint[]; next_cursor: string | null; is_synthetic: true };
export type CanonicalRoute = {
    id: string; state: string; version: number; driver_id: string; vehicle_id: string; updated_at: string;
    warehouse_id: string; plan_version_id: string; stops: RouteStop[]; is_synthetic: true;
    code?: string | null; scheduled_date?: string | null; started_at?: string | null;
    execution_ended_at?: string | null;
    // The response schema declares a dict; these fields are emitted by _route_response.
    vehicle?: { id: string; registration: string; package_units: number; weight_grams: number; volume_cm3: number } | null;
    cargo?: CargoSummary | null; tracking?: RouteTracking | null; allowed_actions: string[];
};
export type RoutesPage = {
    items: CanonicalRoute[]; total: number; page: number; page_size: number; is_synthetic: true; label: string;
};
export type CargoIssue = {
    id: string; fulfillment_line_id: string; expected_quantity: number; observed_quantity: number;
    category: string; reason: string; state: "OPEN" | "RESOLVED"; correction: string | null;
    reported_by: string; resolved_by: string | null; created_at: string; resolved_at: string | null; photo_ids: string[];
};
export type CargoManifest = CargoSummary & { lines: ManifestLine[]; issues: CargoIssue[] };
