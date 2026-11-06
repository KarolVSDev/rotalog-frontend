import type { StockReservation } from "../../inventory/services/stockReservation";

export type SupplierOrderStatus =
    | "Pendente"
    | "Em separação"
    | "Em transporte"
    | "Entregue";

export type CommercialStatus =
    | "Aguardando aceite"
    | "Aceito"
    | "Recusado";

export type FinancialStatus =
    | "Pendente"
    | "Aprovado"
    | "Reembolsado";

export type CustodyStatus =
    | "Aguardando separação"
    | "Em separação"
    | "Pronto para coleta"
    | "Em transporte"
    | "Entregue";

export type SupplierOrderItem = {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
};

export const rejectionReasons = [
    "Estoque indisponível",
    "Impossibilidade de atendimento",
    "Prazo inviável",
    "Outro motivo",
] as const;

export type OrderRejectionReason = typeof rejectionReasons[number];

export type OrderRejection = {
    reason: OrderRejectionReason;
    justification: string;
    rejectedAt: string;
};

export type SupplierOrder = {
    id: string;
    organizationId: string;
    customer: string;
    date: string;
    total: number;
    status: SupplierOrderStatus;
    items: number;
    commercialStatus?: CommercialStatus;
    financialStatus?: FinancialStatus;
    custodyStatus?: CustodyStatus;
    orderItems?: SupplierOrderItem[];
    acceptanceDeadline?: string;
    /** Data real de conclusão, quando fornecida pela origem do pedido. */
    completedAt?: string;
    timeZone?: string;
    rejection?: OrderRejection;
    stockReservation?: StockReservation;
};

export const ordersMock: SupplierOrder[] = [
    {
        id: "PED-001",
        organizationId: "fornecedor-001",
        customer: "Empresa Alfa",
        date: "2026-10-14",
        total: 1250,
        status: "Pendente",
        items: 5,
        commercialStatus: "Aguardando aceite",
        financialStatus: "Pendente",
        custodyStatus: "Aguardando separação",
    },
    {
        id: "PED-002",
        organizationId: "fornecedor-001",
        customer: "Comercial Beta",
        date: "2026-10-13",
        total: 890,
        status: "Em separação",
        items: 3,
        commercialStatus: "Aceito",
        financialStatus: "Aprovado",
        custodyStatus: "Em separação",
    },
    {
        id: "PED-003",
        organizationId: "fornecedor-001",
        customer: "Empresa Gama",
        date: "2026-10-13",
        total: 2340,
        status: "Em transporte",
        items: 8,
        commercialStatus: "Aceito",
        financialStatus: "Aprovado",
        custodyStatus: "Em transporte",
    },
    {
        id: "PED-004",
        organizationId: "fornecedor-001",
        customer: "Distribuidora Delta",
        date: "2026-10-12",
        total: 560,
        status: "Entregue",
        items: 2,
        commercialStatus: "Aceito",
        financialStatus: "Aprovado",
        custodyStatus: "Entregue",
    },
    {
        id: "PED-101",
        organizationId: "fornecedor-002",
        customer: "Mercado Central",
        date: "2026-10-14",
        total: 740,
        status: "Pendente",
        items: 4,
        commercialStatus: "Aguardando aceite",
        financialStatus: "Pendente",
        custodyStatus: "Aguardando separação",
    },
    {
        id: "PED-102",
        organizationId: "fornecedor-002",
        customer: "Comércio Amazonas",
        date: "2026-10-13",
        total: 1920,
        status: "Em separação",
        items: 6,
        commercialStatus: "Aceito",
        financialStatus: "Aprovado",
        custodyStatus: "Em separação",
    },
    {
        id: "PED-103",
        organizationId: "fornecedor-002",
        customer: "Empresa Sol",
        date: "2026-10-12",
        total: 410,
        status: "Entregue",
        items: 2,
        commercialStatus: "Aceito",
        financialStatus: "Aprovado",
        custodyStatus: "Entregue",
    },
];
