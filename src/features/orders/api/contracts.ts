// Confirmado em /openapi.json e ordering/schemas.py do backend local.
export type ProductSnapshot = {
    id: string; name: string; brand: string; category: string; gtin: string | null;
    net_content: number; net_content_unit: "g" | "ml" | "un";
    packaging_type: string; packaging_quantity: number; gross_weight_grams: number;
    volume_cm3: number; variant_attributes: Record<string, string>;
    publication_state: string; version: number; demo_run_id: string; is_synthetic: true;
};
export type OrderItem = {
    id: string; offer_id: string; product: ProductSnapshot; unit_price: string; currency: "BRL";
    offer_version: number; requested_quantity: number; reserved_quantity: number;
    supplier_accepted_quantity: number; supplier_refused_quantity: number;
    separated_quantity: number; dispatched_quantity: number; delivered_quantity: number;
    buyer_accepted_quantity: number; delivery_refused_quantity: number; missing_quantity: number;
    returning_quantity: number; return_reconciled_quantity: number; refunded_quantity: number;
    financially_released_quantity: number; financially_pending_quantity: number;
};
export type Fulfillment = {
    id: string; supplier_order_id: string; warehouse_id: string; state: string; version: number;
    is_synthetic: true;
    lines: { id: string; order_item_id: string; allocated_quantity: number; separated_quantity: number; dispatched_quantity: number }[];
};
export type ApiOrder = {
    // Proposed optional backend field; absent in the current confirmed contract.
    order_number?: string | null;
    id: string; purchase_id: string; buyer_organization_id: string; supplier_organization_id: string;
    warehouse_id: string; state: string; version: number; accepts_partial: boolean;
    acceptance_deadline: string; currency: "BRL"; total: string; cancellation_reason: string | null;
    items: OrderItem[]; allowed_actions: string[]; is_synthetic: true; fulfillments: Fulfillment[];
};
export type OrderPage = { items: ApiOrder[]; total: number; page: number; page_size: number; is_synthetic: true; label: string };
export type Acceptance = { expected_version: number; lines: { order_item_id: string; accepted_quantity: number }[] };
export type Allocation = { expected_version: number; lines: { order_item_id: string; allocated_quantity: number }[] };
export type Separation = { expected_version: number; lines: { fulfillment_line_id: string; separated_quantity: number }[] };
