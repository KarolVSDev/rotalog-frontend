import { ProductIcon } from "../components/ProductIcon";
import { PageHeader } from "../../../shared/components/PageHeader";
import { ProductAvailabilityFilter } from "../components/ProductAvailabilityFilter";
import { ProductImage } from "../components/ProductImage";
import { ProductFormModal } from "../components/ProductFormModal";
import { ProductImportModal } from "../components/ProductImportModal";
import { useSupplierProducts } from "../hooks/useSupplierProducts";

import { useState } from "react";
import { useOutletContext } from "react-router-dom";

import type { Organization } from "../../organizations/mocks/organizations.mock";

import { ProductDetailsModal } from "../components/ProductDetailsModal";

import {
    type ProductAvailability,
    type SupplierProduct,
} from "../mocks/products.mock";

type ProductsContext = {
    activeOrganization: Organization;
};

type AvailabilityFilter = "Todos" | ProductAvailability;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
});

const availabilityStyles: Record<
    ProductAvailability,
    string
> = {
    Disponível: "bg-green-100 text-green-800",
    "Estoque baixo": "bg-amber-100 text-amber-800",
    Indisponível: "bg-red-100 text-red-800",
};

const availabilityOptions: AvailabilityFilter[] = [
    "Todos",
    "Disponível",
    "Estoque baixo",
    "Indisponível",
];

export function SupplierProducts() {
    const { activeOrganization } =
        useOutletContext<ProductsContext>();

    const [search, setSearch] = useState("");
    const [imageWarning, setImageWarning] = useState<string | null>(null);

    const [availabilityFilter, setAvailabilityFilter] =
        useState<AvailabilityFilter>("Todos");

    const [selectedProduct, setSelectedProduct] =
        useState<SupplierProduct | null>(null);

    const { products: organizationProducts, error: productsError } = useSupplierProducts(activeOrganization.id);
    const [management, setManagement] = useState<{ organizationId: string; mode: "new" | "edit" | "import"; product?: SupplierProduct } | null>(null);
    if (management && management.organizationId !== activeOrganization.id) setManagement(null);
    // Pesquisa por código, nome ou categoria
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

            const matchesAvailability =
                availabilityFilter === "Todos" ||
                product.availability === availabilityFilter;

            return matchesSearch && matchesAvailability;
        }
    );

    const hasActiveFilters =
        search.trim() !== "" ||
        availabilityFilter !== "Todos";

    // Não permite exibir detalhes de outra organização
    const visibleSelectedProduct =
        selectedProduct?.organizationId === activeOrganization.id
            ? organizationProducts.find((product) => product.id === selectedProduct.id) ?? null
            : null;

    function handleViewDetails(product: SupplierProduct) {
        if (product.organizationId !== activeOrganization.id) {
            return;
        }

        setSelectedProduct(product);
    }

    function handleCloseDetails() {
        setSelectedProduct(null);
    }

    function clearFilters() {
        setSearch("");
        setAvailabilityFilter("Todos");
    }

    return (
        <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-4">
            <PageHeader title="Produtos" subtitle="Gerencie o catálogo de produtos do fornecedor." actions={<>
                <button type="button" title="Importar XLSX" aria-label="Importar XLSX" onClick={() => setManagement({ organizationId: activeOrganization.id, mode: "import" })} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-700 transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><ProductIcon name="upload" /></button>
                <button type="button" title="Novo produto" aria-label="Novo produto" onClick={() => setManagement({ organizationId: activeOrganization.id, mode: "new" })} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><ProductIcon name="plus" /></button>
            </>} />
            {productsError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{productsError}</p>}
            {imageWarning && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{imageWarning}</p>}
            <section aria-labelledby="product-list-title" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center">
                    <div>
                        <h2 id="product-list-title" className="text-base font-semibold text-slate-900">Lista de produtos</h2>
                        <p aria-live="polite" className="mt-0.5 text-xs text-slate-500">{filteredProducts.length} de {organizationProducts.length} produto(s) encontrado(s)</p>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="relative min-w-0 flex-1 sm:w-64">
                            <label htmlFor="product-search" className="sr-only">Pesquisar por código, nome ou categoria</label>
                            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"><ProductIcon name="search" /></span>
                            <input id="product-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Código, nome ou categoria" className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                        </div>
                        <ProductAvailabilityFilter key={activeOrganization.id} value={availabilityFilter} options={availabilityOptions} hasActiveFilters={hasActiveFilters} onChange={setAvailabilityFilter} onClear={clearFilters} />
                        {hasActiveFilters && <button type="button" onClick={clearFilters} className="h-9 shrink-0 rounded-lg px-2 text-xs font-medium text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600">Limpar</button>}
                    </div>
                </div>
                {filteredProducts.length > 0 ? (
                    <div role="region" aria-label="Rolagem da tabela de produtos" tabIndex={0} className="max-h-[max(18rem,calc(100dvh_-_14rem))] overflow-auto overscroll-y-contain focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600">
                        <table className="w-full min-w-[980px] text-left text-sm">
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
                                        Unidade
                                    </th>

                                    <th scope="col" className="whitespace-nowrap px-4 py-2.5 align-middle font-semibold">
                                        Preço
                                    </th>

                                    <th scope="col" className="whitespace-nowrap px-4 py-2.5 align-middle font-semibold">
                                        Estoque
                                    </th>

                                    <th scope="col" className="whitespace-nowrap px-4 py-2.5 align-middle font-semibold">
                                        Disponibilidade
                                    </th>

                                    <th scope="col" className="whitespace-nowrap px-4 py-2.5 align-middle font-semibold">
                                        Ações
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {filteredProducts.map((product) => (
                                    <tr
                                        key={product.id}
                                        className="hover:bg-slate-50"
                                    >
                                        {/* Código */}
                                        <td className="min-w-24 max-w-40 px-4 py-2.5 align-middle font-semibold text-slate-900 [overflow-wrap:anywhere]">
                                            <span className={product.id.length <= 24 ? "whitespace-nowrap" : "break-all"}>{product.id}</span>
                                        </td>

                                        {/* Nome */}
                                        <td className="min-w-48 max-w-72 [overflow-wrap:anywhere] px-4 py-2.5 align-middle text-slate-700">
                                            <div className="flex items-center gap-3">
                                                <ProductImage organizationId={activeOrganization.id} imageRef={product.imageRef} name={product.name} />
                                                <span className="min-w-0">{product.name}</span>
                                            </div>
                                        </td>

                                        {/* Categoria */}
                                        <td className="min-w-40 max-w-56 [overflow-wrap:anywhere] px-4 py-2.5 align-middle text-slate-600">
                                            {product.category}
                                        </td>

                                        {/* Unidade */}
                                        <td className="px-4 py-2.5 align-middle text-slate-600">
                                            {product.unit}
                                        </td>

                                        {/* Preço */}
                                        <td className="whitespace-nowrap px-4 py-2.5 align-middle font-medium text-slate-900">
                                            {currencyFormatter.format(product.price)}
                                        </td>

                                        {/* Estoque */}
                                        <td className="px-4 py-2.5 align-middle text-slate-700">
                                            {product.stock}
                                        </td>

                                        {/* Disponibilidade */}
                                        <td className="px-4 py-2.5 align-middle">
                                            <span
                                                className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${availabilityStyles[product.availability]
                                                    }`}
                                            >
                                                {product.availability}
                                            </span>
                                        </td>

                                        {/* Ações */}
                                        <td className="px-4 py-2.5 align-middle">
                                            <div className="flex items-center gap-1">
                                                <button type="button" title="Ver detalhes" aria-label={`Ver detalhes de ${product.name}`} onClick={() => handleViewDetails(product)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><ProductIcon name="eye" /></button>
                                                <button type="button" title="Editar produto" aria-label={`Editar produto ${product.name}`} onClick={() => setManagement({ organizationId: activeOrganization.id, mode: "edit", product })} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"><ProductIcon name="pencil" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* Nenhum produto encontrado */
                    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                        <h3 className="text-base font-semibold text-slate-900">
                            Nenhum produto encontrado
                        </h3>

                        <p className="mt-2 max-w-md text-sm text-slate-500">
                            {hasActiveFilters
                                ? "Não encontramos produtos que correspondam aos filtros selecionados."
                                : "Esta organização ainda não possui produtos cadastrados."}
                        </p>

                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                            >
                                Limpar filtros
                            </button>
                        )}
                    </div>
                )}
            </section>

            {management?.organizationId === activeOrganization.id && (management.mode === "import" ? (
                <ProductImportModal key={management.organizationId} organizationId={activeOrganization.id} onClose={() => setManagement(null)} onSaved={() => { setManagement(null); clearFilters(); }} />
            ) : (
                <ProductFormModal key={`${management.organizationId}:${management.product?.id ?? "new"}`} organizationId={activeOrganization.id} product={management.product} onClose={() => setManagement(null)} onSaved={(warning) => { setImageWarning(warning ?? null); setManagement(null); clearFilters(); }} />
            ))}
            {/* Modal de detalhes do produto */}
            {visibleSelectedProduct && (
                <ProductDetailsModal
                    key={`${activeOrganization.id}-${visibleSelectedProduct.id}`}
                    product={visibleSelectedProduct}
                    activeOrganization={activeOrganization}
                    onClose={handleCloseDetails}
                />
            )}
        </div>
    );
}
