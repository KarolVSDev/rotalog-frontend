import { useSupplierInventory } from "../hooks/useSupplierInventory";
import { PageHeader } from "../../../shared/components/PageHeader";
import { StockMovementHistory } from "../components/StockMovementHistory";
import { ProductAvailabilityFilter } from "../../products/components/ProductAvailabilityFilter";
import { ProductIcon } from "../../products/components/ProductIcon";

import { useState } from "react";
import { useOutletContext } from "react-router-dom";

import type { Organization } from "../../organizations/mocks/organizations.mock";

import {
    type ProductAvailability,
} from "../../products/mocks/products.mock";

type InventoryContext = {
    activeOrganization: Organization;
};

type StockFilter = "Todos" | ProductAvailability;

const availabilityOptions: StockFilter[] = ["Todos", "Disponível", "Estoque baixo", "Indisponível"];

const statusStyles: Record<ProductAvailability, string> = {
    Disponível: "bg-green-100 text-green-800",
    "Estoque baixo": "bg-amber-100 text-amber-800",
    Indisponível: "bg-red-100 text-red-800",
};

export function SupplierInventory() {
    const { activeOrganization } =
        useOutletContext<InventoryContext>();

    const [search, setSearch] = useState("");
    const [stockFilter, setStockFilter] =
        useState<StockFilter>("Todos");

    const { products: organizationProducts, error: productsError } = useSupplierInventory(activeOrganization.id);

    const normalizedSearch = search
        .trim()
        .toLocaleLowerCase("pt-BR");

    const filteredProducts = organizationProducts.filter(
        (product) => {
            const matchesSearch = [
                product.id,
                product.name,
                product.category,
            ].some((value) =>
                value
                    .toLocaleLowerCase("pt-BR")
                    .includes(normalizedSearch)
            );

            const matchesStatus =
                stockFilter === "Todos" ||
                product.availability === stockFilter;

            return matchesSearch && matchesStatus;
        }
    );

    const totalProducts = organizationProducts.length;

    const availableProducts = organizationProducts.filter(
        (product) => product.availability === "Disponível"
    ).length;

    const lowStockProducts = organizationProducts.filter(
        (product) => product.availability === "Estoque baixo"
    ).length;

    const unavailableProducts = organizationProducts.filter(
        (product) => product.availability === "Indisponível"
    ).length;

    function clearFilters() {
        setSearch("");
        setStockFilter("Todos");
    }

    const hasActiveFilters =
        search.trim() !== "" || stockFilter !== "Todos";

    const indicators = [
        {
            label: "Total de produtos",
            value: totalProducts,
        },
        {
            label: "Disponíveis",
            value: availableProducts,
        },
        {
            label: "Estoque baixo",
            value: lowStockProducts,
        },
        {
            label: "Indisponíveis",
            value: unavailableProducts,
        },
    ];

    return (
        <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-4">
            {productsError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{productsError}</p>}
            {/* Cabeçalho */}
            <PageHeader title="Estoque" subtitle="Consulte os saldos e a disponibilidade dos produtos." />

            {/* Indicadores */}
            <section
                aria-label="Resumo do estoque"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
                {indicators.map((indicator) => (
                    <div
                        key={indicator.label}
                        className="flex h-full min-h-28 flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                        <p className="text-sm font-medium text-slate-500">
                            {indicator.label}
                        </p>

                        <p className="mt-3 text-3xl font-bold text-slate-900">
                            {indicator.value}
                        </p>
                    </div>
                ))}
            </section>

            {/* Tabela e filtros */}
            <section aria-labelledby="inventory-list-title" className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center">
                    <div>
                        <h2 id="inventory-list-title" className="text-base font-semibold text-slate-900">Posição de estoque</h2>
                        <p aria-live="polite" className="mt-0.5 text-xs text-slate-500">{filteredProducts.length} de {totalProducts} produto(s) encontrado(s)</p>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="relative min-w-0 flex-1 sm:w-64">
                            <label htmlFor="inventory-search" className="sr-only">Pesquisar por código, nome ou categoria</label>
                            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"><ProductIcon name="search" /></span>
                            <input id="inventory-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Código, nome ou categoria" className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                        </div>
                        <ProductAvailabilityFilter key={activeOrganization.id} value={stockFilter} options={availabilityOptions} hasActiveFilters={hasActiveFilters} onChange={setStockFilter} onClear={clearFilters} />
                        {hasActiveFilters && <button type="button" onClick={clearFilters} className="h-9 shrink-0 rounded-lg px-2 text-xs font-medium text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600">Limpar</button>}
                    </div>
                </div>

                {filteredProducts.length > 0 ? (
                    <div role="region" aria-label="Rolagem da tabela de estoque" tabIndex={0} className="max-h-[max(18rem,calc(100dvh_-_23rem))] overflow-auto overscroll-y-contain focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600">
                        <table className="w-full min-w-[880px] text-left text-sm">
                            <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600">
                                <tr>
                                    <th scope="col" className="whitespace-nowrap px-4 py-2.5 align-middle font-semibold">
                                        Código
                                    </th>
                                    <th scope="col" className="whitespace-nowrap px-4 py-2.5 align-middle font-semibold">
                                        Produto
                                    </th>
                                    <th scope="col" className="whitespace-nowrap px-4 py-2.5 align-middle font-semibold">
                                        Categoria
                                    </th>
                                    <th scope="col" className="whitespace-nowrap px-4 py-2.5 align-middle font-semibold">
                                        Estoque físico
                                    </th>
                                    <th scope="col" className="whitespace-nowrap px-4 py-2.5 align-middle font-semibold">Reservado</th>
                                    <th scope="col" className="whitespace-nowrap px-4 py-2.5 align-middle font-semibold">Disponível</th>
                                    <th scope="col" className="whitespace-nowrap px-4 py-2.5 align-middle font-semibold">
                                        Unidade
                                    </th>
                                    <th scope="col" className="whitespace-nowrap px-4 py-2.5 align-middle font-semibold">
                                        Disponibilidade
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {filteredProducts.map((product) => (
                                    <tr
                                        key={product.id}
                                        className="hover:bg-slate-50"
                                    >
                                        <td className="min-w-24 max-w-40 px-4 py-2.5 align-middle font-semibold text-slate-900 [overflow-wrap:anywhere]">
                                            <span className={product.id.length <= 24 ? "whitespace-nowrap" : "break-all"}>{product.id}</span>
                                        </td>

                                        <td className="min-w-40 max-w-64 [overflow-wrap:anywhere] px-4 py-2.5 align-middle text-slate-700">
                                            {product.name}
                                        </td>

                                        <td className="min-w-32 max-w-48 [overflow-wrap:anywhere] px-4 py-2.5 align-middle text-slate-600">
                                            {product.category}
                                        </td>

                                        <td className="px-4 py-2.5 align-middle font-semibold text-slate-900">
                                            {product.physical}
                                        </td>

                                        <td className="px-4 py-2.5 align-middle text-amber-700">{product.reserved}</td>
                                        <td className="px-4 py-2.5 align-middle font-semibold text-slate-900">{product.available}</td>
                                        <td className="px-4 py-2.5 align-middle text-slate-600">
                                            {product.unit}
                                        </td>

                                        <td className="px-4 py-2.5 align-middle">
                                            <span
                                                className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${statusStyles[product.availability]
                                                    }`}
                                            >
                                                {product.availability}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="px-6 py-12 text-center">
                        <h3 className="font-semibold text-slate-900">
                            Nenhum produto encontrado
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                            {hasActiveFilters
                                ? "Tente ajustar os filtros de pesquisa."
                                : "Esta organização ainda não possui produtos cadastrados."}
                        </p>

                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                            >
                                Limpar filtros
                            </button>
                        )}
                    </div>
                )}
            </section>
            <StockMovementHistory key={activeOrganization.id} organization={activeOrganization} />
        </div>
    );
}
