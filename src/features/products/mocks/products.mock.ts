
import type { StockMovement } from "../../inventory/models/stockMovement";

export type ProductAvailability =
    | "Disponível"
    | "Estoque baixo"
    | "Indisponível";

export type SupplierProduct = {
    id: string;
    organizationId: string;
    name: string;
    category: string;
    unit: string;
    price: number;
    stock: number;
    imageRef?: string;
    stockMovements?: StockMovement[];
    availability: ProductAvailability;
};

export const productsMock: SupplierProduct[] = [
    // FORNECEDOR EXEMPLO
    {
        id: "PROD-001",
        organizationId: "fornecedor-001",
        name: "Cimento CP II 50kg",
        category: "Materiais de construção",
        unit: "Saco",
        price: 39.9,
        stock: 120,
        availability: "Disponível",
    },
    {
        id: "PROD-002",
        organizationId: "fornecedor-001",
        name: "Areia média",
        category: "Materiais de construção",
        unit: "m³",
        price: 145,
        stock: 8,
        availability: "Estoque baixo",
    },
    {
        id: "PROD-003",
        organizationId: "fornecedor-001",
        name: "Tijolo cerâmico",
        category: "Alvenaria",
        unit: "Unidade",
        price: 1.2,
        stock: 2500,
        availability: "Disponível",
    },
    {
        id: "PROD-004",
        organizationId: "fornecedor-001",
        name: "Vergalhão de aço 10mm",
        category: "Ferragens",
        unit: "Barra",
        price: 68.5,
        stock: 0,
        availability: "Indisponível",
    },

    // DISTRIBUIDORA NORTE
    {
        id: "PROD-101",
        organizationId: "fornecedor-002",
        name: "Tinta acrílica branca 18L",
        category: "Tintas",
        unit: "Lata",
        price: 219.9,
        stock: 45,
        availability: "Disponível",
    },
    {
        id: "PROD-102",
        organizationId: "fornecedor-002",
        name: "Argamassa AC-II 20kg",
        category: "Materiais de construção",
        unit: "Saco",
        price: 29.9,
        stock: 75,
        availability: "Disponível",
    },
    {
        id: "PROD-103",
        organizationId: "fornecedor-002",
        name: "Tubo PVC 100mm",
        category: "Hidráulica",
        unit: "Barra",
        price: 54.9,
        stock: 32,
        availability: "Disponível",
    },
    {
        id: "PROD-104",
        organizationId: "fornecedor-002",
        name: "Fio elétrico 2,5mm²",
        category: "Elétrica",
        unit: "Rolo",
        price: 189,
        stock: 0,
        availability: "Indisponível",
    },
];
