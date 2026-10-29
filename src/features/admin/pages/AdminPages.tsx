import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { adminAuthorized } from "../../services/apiAuth.service";
import { PasswordChangeDialog } from "../../account/components/PasswordChangeDialog";
import { authMode } from "../../../shared/api/config";
import { PageHeader } from "../../../shared/components/PageHeader";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
    CatalogRepository,
    catalogCategories,
    catalogError,
    catalogMutationError,
    productCategory,
    publicationLabel,
    type CatalogOverview,
    type CatalogPage,
    type ProductCreate,
} from "../../products/api/catalogRepository";
import { ApiCatalogDetails } from "../../products/api/ApiCatalogDetails";
import { ProductCategoryFilter } from "../../../shared/components/ProductCategoryFilter";
import { CanonicalImageSelection } from "../../products/components/CanonicalImageSelection";
import { AdminProductGallery } from "../../products/components/AdminProductGallery";
import { ProductImagesRepository, imageOperationError, type ImageJob, type ProductGallery } from "../../products/api/productImagesRepository";
import { AuthenticatedProductImage } from "../../../shared/components/AuthenticatedProductImage";
import type { AdminWorkflow } from "../layout/AdminLayout";

const primaryButton = "inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";
const secondaryButton = "inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";
const fieldClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100";
const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";

export function AdminOverview() {
    const { user } = useAuth();
    const canWriteProducts = !!user && adminAuthorized(user, "product:write");
    const repository = useMemo(() => new CatalogRepository(user?.organization_id ?? ""), [user?.organization_id]);
    const [attempt, setAttempt] = useState(0);
    const [snapshotState, setSnapshotState] = useState<{ key: string; data: CatalogOverview } | null>(null);
    const [errorState, setErrorState] = useState<{ key: string; message: string } | null>(null);
    const requestKey = `${user?.organization_id ?? ""}:${attempt}`;
    const snapshot = snapshotState?.key === requestKey ? snapshotState.data : null;
    const error = errorState?.key === requestKey ? errorState.message : "";

    useEffect(() => {
        let active = true;
        void repository.listAllPublished()
            .then(data => { if (active) setSnapshotState({ key: requestKey, data }); })
            .catch(failure => { if (active) setErrorState({ key: requestKey, message: catalogError(failure) }); });
        return () => { active = false; };
    }, [repository, requestKey]);

    const brandData = useMemo(() => {
        if (!snapshot) return [];
        const counts = new Map<string, number>();
        for (const product of snapshot.products) {
            counts.set(product.brand, (counts.get(product.brand) ?? 0) + 1);
        }
        const sorted = [...counts].sort(([leftName, leftCount], [rightName, rightCount]) =>
            rightCount - leftCount || leftName.localeCompare(rightName, "pt-BR"),
        );
        const colors = ["#1d4ed8", "#059669", "#7c3aed", "#ea580c", "#0891b2", "#64748b"];
        const topBrands = sorted.slice(0, 5).map(([name, count], index) => ({
            name, count, color: colors[index],
        }));
        const otherCount = sorted.slice(5).reduce((total, [, count]) => total + count, 0);
        return otherCount > 0
            ? [...topBrands, { name: "Outras marcas", count: otherCount, color: colors[5] }]
            : topBrands;
    }, [snapshot]);

    const brandCount = snapshot ? new Set(snapshot.products.map(product => product.brand)).size : 0;
    const identifiedCount = snapshot ? snapshot.products.filter(product => product.gtin !== null).length : 0;

    return <div className="space-y-6">
        <PageHeader title={`Olá, ${user?.name ?? "administrador"}`} subtitle="Gerencie a identificação dos produtos do catálogo RotaLog."/>
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#102957] via-blue-900 to-blue-700 p-6 text-white shadow-sm sm:p-8">
            <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-200">Área administrativa</p>
                <h2 className="admin-catalog-banner-title mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Catálogo canônico</h2>
                <p className="mt-3 text-sm leading-6 text-blue-100 sm:text-base">Cadastre informações de identificação e embalagem. Preços, ofertas e estoque são gerenciados pelos fornecedores.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                    <Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-blue-900 transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" to="/admin/products">Ver produtos publicados</Link>
                    {canWriteProducts && <Link className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/40 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" to="/admin/products/new">Cadastrar produto</Link>}
                </div>
            </div>
        </section>
        <section className="space-y-4" aria-label="Indicadores do catálogo">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div><h2 className="text-lg font-bold text-slate-900">Visão geral do catálogo</h2><p className="mt-1 text-sm text-slate-600">Indicadores de produtos publicados, carregados em todas as páginas da API.</p></div>
                {snapshot && <p className="text-xs text-slate-500">Total informado pela API: {snapshot.total}</p>}
            </div>
            {!snapshot && !error && <p role="status" aria-live="polite" className="text-sm text-slate-600">Carregando indicadores do catálogo…</p>}
            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>Não foi possível carregar os indicadores do catálogo: {error}</p><button type="button" className="mt-2 font-semibold underline" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div>}
            {snapshot && <>
                <div className="grid gap-4 sm:grid-cols-3">
                    <article className={cardClass}><p className="text-sm font-medium text-slate-600">Produtos publicados</p><p className="mt-2 text-3xl font-bold text-slate-900">{snapshot.total}</p><p className="mt-1 text-xs text-slate-500">Totalizador global da API</p></article>
                    <article className={cardClass}><p className="text-sm font-medium text-slate-600">Marcas no catálogo</p><p className="mt-2 text-3xl font-bold text-slate-900">{brandCount}</p><p className="mt-1 text-xs text-slate-500">Calculado sobre o catálogo completo</p></article>
                    <article className={cardClass}><p className="text-sm font-medium text-slate-600">Produtos com GTIN</p><p className="mt-2 text-3xl font-bold text-slate-900">{identifiedCount}</p><p className="mt-1 text-xs text-slate-500">De {snapshot.total} produtos publicados</p></article>
                </div>
                <section className={`${cardClass} min-w-0`} aria-labelledby="admin-brand-chart-title">
                    <h3 id="admin-brand-chart-title" className="font-bold text-slate-900">Produtos publicados por marca</h3>
                    <p className="mt-1 text-sm text-slate-600">Distribuição do catálogo completo; marcas além das cinco primeiras são agrupadas.</p>
                    {brandData.length === 0
                        ? <p className="flex h-56 items-center justify-center text-sm text-slate-600">Não há produtos publicados para exibir.</p>
                        : <div className="mt-3 h-64 min-w-0" role="group" aria-label="Gráfico de produtos publicados por marca">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <BarChart data={brandData} layout="vertical" margin={{ right: 24 }} accessibilityLayer>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0"/>
                                    <XAxis type="number" allowDecimals={false} tick={{ fill: "#475569", fontSize: 12 }}/>
                                    <YAxis type="category" dataKey="name" width={132} tick={{ fill: "#475569", fontSize: 12 }} tickLine={false} axisLine={false}/>
                                    <Tooltip/>
                                    <Bar dataKey="count" name="Produtos publicados" radius={[0, 4, 4, 0]} maxBarSize={24} isAnimationActive={false}>
                                        {brandData.map(item => <Cell key={item.name} fill={item.color}/>)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>}
                </section>
            </>}
        </section>
        <div className="grid gap-4 md:grid-cols-2">
            <article className={`${cardClass} transition hover:border-blue-200 hover:shadow-md`}><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-blue-800" aria-hidden="true">01</span><h3 className="mt-4 font-semibold text-slate-900">Consultar produtos</h3><p className="mt-2 text-sm leading-6 text-slate-600">Pesquise o catálogo publicado e consulte os dados de cada produto.</p><Link className="mt-4 inline-flex text-sm font-semibold text-blue-800 hover:underline" to="/admin/products">Abrir catálogo<span aria-hidden="true" className="ml-1">→</span></Link></article>
            {canWriteProducts && <article className={`${cardClass} transition hover:border-blue-200 hover:shadow-md`}><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg font-bold text-emerald-800" aria-hidden="true">02</span><h3 className="mt-4 font-semibold text-slate-900">Cadastrar produto</h3><p className="mt-2 text-sm leading-6 text-slate-600">Crie um rascunho e publique-o em uma etapa separada, após a revisão.</p><Link className="mt-4 inline-flex text-sm font-semibold text-blue-800 hover:underline" to="/admin/products/new">Iniciar cadastro<span aria-hidden="true" className="ml-1">→</span></Link></article>}
        </div>
    </div>;
}

export function AdminCatalog() {
    const { user } = useAuth();
    const canWriteProducts = !!user && adminAuthorized(user, "product:write");
    const repository = useMemo(() => new CatalogRepository(user?.organization_id ?? ""), [user?.organization_id]);
    const [search, setSearch] = useState("");
    const [query, setQuery] = useState({ page: 1, search: "" });
    const [resultState, setResultState] = useState<{ key: string; data: CatalogPage } | null>(null);
    const [errorState, setErrorState] = useState<{ key: string; message: string } | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [selected, setSelected] = useState<string | null>(null);
    const [category, setCategory] = useState("");
    const requestKey = `${user?.organization_id ?? ""}:${query.page}:${query.search}`;
    const result = resultState?.key === requestKey ? resultState.data : null;
    const error = errorState?.key === requestKey ? errorState.message : "";

    useEffect(() => {
        let active = true;
        void repository.list(query.page, query.search)
            .then(data => { if (active) setResultState({ key: requestKey, data }); })
            .catch(failure => { if (active) setErrorState({ key: requestKey, message: catalogError(failure) }); });
        return () => { active = false; };
    }, [repository, query, requestKey, attempt]);

    function retry() {
        setResultState(null);
        setErrorState(null);
        setAttempt(value => value + 1);
    }
    function changeQuery(page: number, name: string) {
        setResultState(null);
        setErrorState(null);
        setCategory("");
        setQuery({ page, search: name });
    }
    const categories = result ? catalogCategories(result.items) : [];
    const visibleProducts = result?.items.filter(product => !category || product.category === category) ?? [];

    return <div className="space-y-5">
        <PageHeader title="Produtos publicados" subtitle="Consulte e organize os produtos disponíveis no catálogo canônico." actions={canWriteProducts ? <Link className={primaryButton} to="/admin/products/new">Cadastrar produto</Link> : undefined}/>
        <section className={`${cardClass} space-y-5`} aria-label="Catálogo de produtos publicados">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div><h2 className="text-lg font-bold text-slate-900">Catálogo publicado</h2><p className="mt-1 text-sm text-slate-500">Pesquise produtos e consulte seus dados comerciais e de embalagem.</p></div>
                {result && <span className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-800">{result.total} produto(s)</span>}
            </div>
            <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); changeQuery(1, search.trim()); }}>
                <label htmlFor="admin-product-search" className="min-w-52 flex-1 text-sm font-medium text-slate-700">Buscar produto<input id="admin-product-search" type="search" maxLength={200} value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome do produto" className={fieldClass}/></label>
                <ProductCategoryFilter categories={categories} value={category} onChange={setCategory} label="Categoria nesta página"/>
                <button type="submit" className={secondaryButton}>Pesquisar</button>
                <button type="button" className={secondaryButton} onClick={() => { setSearch(""); changeQuery(1, ""); }}>Limpar</button>
            </form>
            {!result && !error && <p role="status" aria-live="polite" className="mt-5 text-sm text-slate-600">Carregando produtos publicados…</p>}
            {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{error}</p><button type="button" className="mt-2 font-semibold underline" onClick={retry}>Tentar novamente</button></div>}
            {result && !result.items.length && <p role="status" className="py-10 text-center text-sm text-slate-600">{query.search ? "Nenhum produto publicado corresponde à busca." : "Ainda não há produtos publicados no catálogo."}</p>}
            {result && !!result.items.length && !visibleProducts.length && <p role="status" className="py-8 text-center text-sm text-slate-600">Nenhum produto desta página pertence à categoria selecionada.</p>}
            {result && !!visibleProducts.length && <div role="region" aria-label="Lista de produtos publicados" className="grid gap-4 md:grid-cols-2">
                {visibleProducts.map(product => <article key={product.id} aria-label={product.name} className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-blue-200 hover:shadow-sm">
                    <div className="flex gap-4 p-4 sm:p-5">
                        <AuthenticatedProductImage productId={product.id} image={product.primary_image ?? product.images?.find(image => image.is_primary)} name={product.name} className="h-24 w-24"/>
                        <div className="min-w-0 flex-1">
                            <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">{productCategory(product.category)}</span>
                            <h3 className="mt-2 break-words font-bold text-slate-900">{product.name}</h3>
                            <p className="mt-1 truncate text-sm text-slate-600">{product.brand}</p>
                            <p className="mt-2 text-sm text-slate-700">{product.packaging_quantity} × {product.net_content} {product.net_content_unit}</p>
                            <p className="mt-1 text-xs text-slate-500">{product.packaging_type} · GTIN {product.gtin ?? "não informado"}</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200">{publicationLabel(product.publication_state)}</span>
                        <button type="button" className="font-semibold text-blue-800 hover:underline" onClick={() => setSelected(product.id)}>Ver detalhes</button>
                    </div>
                </article>)}
            </div>}
            {result && <nav aria-label="Paginação de produtos" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm"><p aria-live="polite">Página {result.page} de {Math.max(1, Math.ceil(result.total / result.page_size))} · {result.total} produto(s)</p><div className="flex gap-2"><button type="button" className={secondaryButton} disabled={result.page <= 1} onClick={() => changeQuery(result.page - 1, query.search)}>Anterior</button><button type="button" className={secondaryButton} disabled={result.page * result.page_size >= result.total} onClick={() => changeQuery(result.page + 1, query.search)}>Próxima</button></div></nav>}
        </section>
        {selected && <ApiCatalogDetails key={`${user?.id}:${user?.organization_id}:${selected}`} id={selected} repository={repository} onClose={() => setSelected(null)} onChanged={() => setAttempt(value => value + 1)}/>}
    </div>;
}

function positiveInteger(formData: FormData, name: string, label: string) {
    const value = String(formData.get(name) ?? "").trim();
    if (!/^\d+$/.test(value)) throw new Error(`${label}: informe um número inteiro positivo.`);
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 1 || number > 2_147_483_647) throw new Error(`${label}: o valor deve estar entre 1 e 2.147.483.647.`);
    return number;
}
type VariantAttributeField = { id: number; name: string; description: string };

function normalizedAttributeName(name: string): string {
    return name.trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .toLocaleLowerCase("en-US");
}

function productInput(formData: FormData, attributeFields: VariantAttributeField[]): ProductCreate {
    const text = (name: string, label: string) => {
        const value = String(formData.get(name) ?? "").trim();
        if (!value) throw new Error(`${label} é obrigatório.`);
        if (value.length > 200) throw new Error(`${label} deve ter no máximo 200 caracteres.`);
        return value;
    };
    if (attributeFields.length > 20) throw new Error("Adicione no máximo 20 características.");
    const attributeNames = new Set<string>();
    const attributeEntries: [string, string][] = [];
    for (const [index, field] of attributeFields.entries()) {
        const name = normalizedAttributeName(field.name);
        const description = field.description.trim();
        if (!name || !description) throw new Error(`Preencha a característica e a descrição do item ${index + 1}, ou remova-o.`);
        if (attributeNames.has(name)) throw new Error(`A característica "${field.name.trim()}" está repetida. Use nomes diferentes.`);
        attributeNames.add(name);
        attributeEntries.push([name, description]);
    }
    const attributes = Object.fromEntries(attributeEntries);
    const gtin = String(formData.get("gtin") ?? "").trim();
    if (gtin && !/^(?:\d{8}|\d{12,14})$/.test(gtin)) throw new Error("GTIN deve conter 8 ou de 12 a 14 algarismos.");
    return {
        name: text("name", "Nome"),
        brand: text("brand", "Marca"),
        category: "ALIMENTO_SECO_INDUSTRIALIZADO",
        gtin: gtin || null,
        net_content: positiveInteger(formData, "net_content", "Conteúdo líquido"),
        net_content_unit: String(formData.get("net_content_unit")) as ProductCreate["net_content_unit"],
        packaging_type: text("packaging_type", "Tipo de embalagem"),
        packaging_quantity: positiveInteger(formData, "packaging_quantity", "Quantidade por embalagem"),
        gross_weight_grams: positiveInteger(formData, "gross_weight_grams", "Peso bruto"),
        volume_cm3: positiveInteger(formData, "volume_cm3", "Volume"),
        variant_attributes: attributes,
    };
}

export function AdminProductCreate() {
    const { user } = useAuth();
    return <SessionAdminProductCreate key={`${user?.id}:${user?.organization_id}`}/>;
}

function SessionAdminProductCreate() {
    const { user } = useAuth();
    const workflow = useOutletContext<AdminWorkflow>();
    const repository = useMemo(() => new CatalogRepository(user?.organization_id ?? ""), [user?.organization_id]);
    const [formOpen, setFormOpen] = useState(false);
    const [attributeFields, setAttributeFields] = useState<VariantAttributeField[]>([]);
    const nextAttributeId = useRef(0);
    const [error, setError] = useState("");
    const [verificationError, setVerificationError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [imageJobs, setImageJobs] = useState<ImageJob[]>([]);
    const [imageChecking, setImageChecking] = useState(false);
    const [imageBusy, setImageBusy] = useState(false);
    const [imageMessage, setImageMessage] = useState("");
    const [imageSnapshot, setImageSnapshot] = useState<ProductGallery | null>(null);
    const imageRepository = useMemo(() => new ProductImagesRepository(user?.organization_id ?? ""), [user?.organization_id]);
    const imageController = useRef<AbortController | null>(null);
    useEffect(() => () => imageController.current?.abort(), []);

    async function create(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (imageChecking || submitting) return;
        setError("");
        let payload: ProductCreate;
        try { payload = productInput(new FormData(event.currentTarget), attributeFields); }
        catch (failure) { setError(failure instanceof Error ? failure.message : "Revise os campos do produto."); return; }
        setSubmitting(true);
        try {
            const product = await repository.createProduct(payload);
            workflow.setCreatedProduct(product);
            workflow.setCreationUncertain(false);
            workflow.setPublicationStatus("not-started");
            workflow.setPublishedProduct(null);
            if (imageJobs.length) {
                const controller = new AbortController(); imageController.current = controller;
                try {
                    for (const job of imageJobs) {
                        const gallery = await imageRepository.resume(product.id, job, controller.signal, setImageMessage);
                        setImageSnapshot(gallery);
                        workflow.setCreatedProduct({ ...product, version: gallery.product_version, images: gallery.images, primary_image: gallery.images.find(image => image.is_primary) ?? null });
                    }
                    setImageMessage("Produto salvo e imagens associadas.");
                } catch (failure) {
                    if (!controller.signal.aborted) setImageMessage(`Produto salvo. O envio das imagens não foi concluído: ${imageOperationError(failure)} Use a galeria abaixo para retomar, sem recriar o produto.`);
                }
            }
        } catch (failure) {
            const uncertain = !(failure instanceof Error && "status" in failure && typeof failure.status === "number" && failure.status < 500);
            workflow.setCreationUncertain(uncertain);
            setError(catalogMutationError(failure, "create"));
        } finally { setSubmitting(false); }
    }

    async function publish() {
        const product = workflow.createdProduct;
        if (!product || workflow.publicationStatus !== "not-started") return;
        workflow.setPublicationStatus("attempting");
        setError("");
        setVerificationError("");
        try {
            const published = await repository.publishProduct(product.id, product.version);
            workflow.setCreatedProduct(published);
            workflow.setPublishedProduct(published);
            workflow.setPublicationStatus("published");
        } catch (failure) {
            workflow.setPublicationStatus(failure instanceof Error && "status" in failure && typeof failure.status === "number" && failure.status < 500 ? "rejected" : "uncertain");
            setError(catalogMutationError(failure, "publish"));
        }
    }

    async function verifyPublication() {
        const product = workflow.createdProduct;
        if (!product) return;
        setVerificationError("");
        try {
            const published = await repository.detail(product.id);
            if (published.publication_state !== "PUBLISHED") {
                workflow.setCreatedProduct(published);
                setVerificationError("A consulta por ID confirmou que o produto ainda não está publicado. Administradores podem consultar rascunhos pelo ID, mas ainda não existe listagem administrativa de rascunhos. Não repita a publicação automaticamente.");
                return;
            }
            workflow.setCreatedProduct(published);
            workflow.setPublishedProduct(published);
            workflow.setPublicationStatus("published");
        } catch (failure) {
            setVerificationError(failure instanceof Error && "status" in failure && failure.status === 404
                ? "A consulta por ID não encontrou este produto. Administradores podem consultar rascunhos pelo ID, mas ainda não existe listagem administrativa de rascunhos. Não repita a publicação."
                : catalogError(failure));
        }
    }

    const product = workflow.createdProduct;
    const canStartAnother = workflow.publicationStatus === "published";
    return <div className="space-y-5">
        <PageHeader title="Cadastrar produto canônico" subtitle="Informe os dados do produto e da embalagem. Preço e estoque são cadastrados pelo fornecedor."/>
        {workflow.creationUncertain && !product && <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><h2 className="font-bold">Resultado do cadastro não confirmado</h2><p className="mt-1 leading-6">Não repita este cadastro. Administradores podem consultar rascunhos pelo ID, mas ainda não existe listagem administrativa de rascunhos. Sem o ID retornado, esta tela não consegue recuperar o resultado do cadastro.</p></section>}
        {product && <section className={`${cardClass} border-blue-200`} aria-label="Produto criado nesta sessão">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-blue-700">{workflow.publicationStatus === "published" ? "Produto publicado" : "Rascunho criado"}</p><h2 className="mt-1 text-xl font-bold text-slate-900">{product.name}</h2><p className="mt-1 text-sm text-slate-600">{product.brand} · {product.packaging_type}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${workflow.publicationStatus === "published" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{workflow.publicationStatus === "published" ? "Publicado" : publicationLabel(product.publication_state)}</span></div>
            {workflow.publicationStatus !== "published" && <p className="mt-4 text-sm leading-6 text-slate-600">O produto foi criado como rascunho. Ele não aparece no catálogo publicado até a confirmação explícita da publicação.</p>}
            {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            {verificationError && <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{verificationError}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
                {workflow.publicationStatus === "not-started" && <button type="button" className={primaryButton} disabled={submitting || imageBusy} onClick={() => void publish()}>Publicar produto</button>}
                {(workflow.publicationStatus === "uncertain" || workflow.publicationStatus === "rejected") && <button type="button" className={secondaryButton} onClick={() => void verifyPublication()}>Consultar se foi publicado</button>}
                {workflow.publicationStatus === "published" && <Link className={primaryButton} to="/admin/products">Consultar catálogo publicado</Link>}
                {canStartAnother && <button type="button" className={secondaryButton} disabled={submitting || imageBusy} onClick={() => { setImageJobs([]); setImageSnapshot(null); setImageMessage(""); workflow.setCreatedProduct(null); workflow.setCreationUncertain(false); workflow.setPublicationStatus("not-started"); workflow.setPublishedProduct(null); }}>Cadastrar outro produto</button>}
            </div>
            {(workflow.publicationStatus === "uncertain" || workflow.publicationStatus === "rejected") && <p className="mt-3 text-xs leading-5 text-slate-500">A consulta acima é somente leitura e permite consultar rascunhos pelo ID. Ainda não existe listagem administrativa de rascunhos. Não haverá repetição automática da publicação.</p>}
            {imageMessage && <p role="status" className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-950">{imageMessage}</p>}
            <AdminProductGallery key={product.id} productId={product.id} initialJobs={imageJobs} snapshot={imageSnapshot} disabled={submitting || !["not-started", "published"].includes(workflow.publicationStatus)} onBusy={setImageBusy} onGallery={gallery => {
                setImageSnapshot(gallery);
                if (imageJobs.length && imageJobs.every(job => job.attached)) setImageMessage("Produto salvo e imagens associadas.");
                workflow.setCreatedProduct(previous => previous?.id === product.id ? { ...previous, version: gallery.product_version, images: gallery.images, primary_image: gallery.images.find(image => image.is_primary) ?? null } : previous);
            }}/>
        </section>}
        {!product && !workflow.creationUncertain && <section className={`${cardClass} flex flex-wrap items-center justify-between gap-4`} aria-label="Opção de cadastro individual">
            <div><h2 className="font-bold text-slate-900">Cadastro individual</h2><p className="mt-1 text-sm text-slate-600">Informe os dados de identificação e embalagem para criar um rascunho.</p></div>
            <button type="button" className={primaryButton} aria-controls="admin-product-form" aria-expanded={formOpen} onClick={() => setFormOpen(open => !open)}>{formOpen ? "Recolher formulário" : "Iniciar cadastro individual"}</button>
        </section>}
        {!product && !workflow.creationUncertain && <form id="admin-product-form" hidden={!formOpen} className={`${cardClass} space-y-6`} onSubmit={event => void create(event)}>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
                <div className="space-y-5">
                    <section className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                        <h2 className="font-bold text-slate-900">Identificação do produto</h2>
                        <p className="mt-1 text-sm text-slate-500">Dados principais para reconhecer o produto no catálogo.</p>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Nome do produto<input name="name" required maxLength={200} className={fieldClass}/></label>
                            <label className="text-sm font-semibold text-slate-700">Marca<input name="brand" required maxLength={200} className={fieldClass}/></label>
                            <label className="text-sm font-semibold text-slate-700">GTIN (opcional)<input name="gtin" inputMode="numeric" pattern="(?:[0-9]{8}|[0-9]{12,14})" maxLength={14} className={fieldClass} aria-describedby="gtin-help"/><span id="gtin-help" className="mt-1 block text-xs font-normal text-slate-500">8 ou de 12 a 14 algarismos.</span></label>
                            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Categoria<select name="category" value="ALIMENTO_SECO_INDUSTRIALIZADO" disabled className={fieldClass}><option value="ALIMENTO_SECO_INDUSTRIALIZADO">Alimento seco industrializado</option></select><span className="mt-1 block text-xs font-normal text-slate-500">Categoria disponível no catálogo atualmente.</span></label>
                        </div>
                    </section>
                    <section className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                        <h2 className="font-bold text-slate-900">Conteúdo e embalagem</h2>
                        <p className="mt-1 text-sm text-slate-500">Informe a quantidade comercializada na embalagem.</p>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <label className="text-sm font-semibold text-slate-700">Conteúdo líquido<input name="net_content" type="number" required min={1} max={2147483647} step={1} className={fieldClass}/></label>
                            <label className="text-sm font-semibold text-slate-700">Unidade do conteúdo<select name="net_content_unit" defaultValue="g" className={fieldClass}><option value="g">g</option><option value="ml">ml</option><option value="un">un</option></select></label>
                            <label className="text-sm font-semibold text-slate-700">Tipo de embalagem<input name="packaging_type" required maxLength={200} className={fieldClass}/></label>
                            <label className="text-sm font-semibold text-slate-700">Quantidade por embalagem<input name="packaging_quantity" type="number" required min={1} max={2147483647} step={1} className={fieldClass}/></label>
                        </div>
                    </section>
                    <section className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                        <h2 className="font-bold text-slate-900">Peso e dimensões</h2>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <label className="text-sm font-semibold text-slate-700">Peso bruto (gramas)<input name="gross_weight_grams" type="number" required min={1} max={2147483647} step={1} className={fieldClass}/></label>
                            <label className="text-sm font-semibold text-slate-700">Volume (cm³)<input name="volume_cm3" type="number" required min={1} max={2147483647} step={1} className={fieldClass}/></label>
                        </div>
                    </section>
                    <section className="rounded-2xl border border-slate-200 p-4 sm:p-5" aria-labelledby="product-characteristics-title">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h2 id="product-characteristics-title" className="font-semibold text-slate-900">Características adicionais do produto</h2>
                                <p id="product-characteristics-help" className="mt-1 text-sm text-slate-500">Inclua detalhes que ajudam a diferenciar este produto. Esta seção é opcional.</p>
                            </div>
                            <span className="text-xs font-medium text-slate-500">{attributeFields.length} de 20</span>
                        </div>
                        {attributeFields.length > 0 && <div className="mt-4 space-y-3">
                            {attributeFields.map((field, index) => (
                                <fieldset key={field.id} className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                                    <legend className="sr-only">Característica {index + 1}</legend>
                                    <label htmlFor={`product-characteristic-name-${field.id}`} className="text-sm font-semibold text-slate-700">
                                        Característica
                                        <input
                                            id={`product-characteristic-name-${field.id}`}
                                            type="text"
                                            value={field.name}
                                            onChange={event => setAttributeFields(fields => fields.map(item => item.id === field.id ? { ...item, name: event.target.value } : item))}
                                            placeholder="Ex.: Tipo"
                                            aria-describedby="product-characteristics-help"
                                            className={fieldClass}
                                        />
                                    </label>
                                    <label htmlFor={`product-characteristic-description-${field.id}`} className="text-sm font-semibold text-slate-700">
                                        Descrição
                                        <input
                                            id={`product-characteristic-description-${field.id}`}
                                            type="text"
                                            value={field.description}
                                            onChange={event => setAttributeFields(fields => fields.map(item => item.id === field.id ? { ...item, description: event.target.value } : item))}
                                            placeholder="Ex.: Espaguete"
                                            aria-describedby="product-characteristics-help"
                                            className={fieldClass}
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        className={`${secondaryButton} w-full sm:w-auto`}
                                        aria-label={`Remover característica ${index + 1}`}
                                        onClick={() => setAttributeFields(fields => fields.filter(item => item.id !== field.id))}
                                    >
                                        Remover
                                    </button>
                                </fieldset>
                            ))}
                        </div>}
                        <button
                            type="button"
                            className={`${secondaryButton} mt-4`}
                            disabled={attributeFields.length >= 20}
                            onClick={() => setAttributeFields(fields => [...fields, { id: nextAttributeId.current++, name: "", description: "" }])}
                        >
                            Adicionar característica
                        </button>
                    </section>
                </div>
                <aside className="space-y-3">
                    <CanonicalImageSelection jobs={imageJobs} onChange={setImageJobs} disabled={submitting} onChecking={setImageChecking}/>
                    <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                        <h2 className="font-bold">Cadastro canônico</h2>
                        <p className="mt-1">O cadastro cria um rascunho. Preços, estoque, depósitos e ofertas são gerenciados pelo fornecedor.</p>
                        <p className="mt-2 text-blue-800">Rascunhos podem ser consultados pelo ID por administradores. Ainda não existe listagem administrativa de rascunhos; guarde o ID retornado.</p>
                    </div>
                </aside>
            </div>
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                <p className="max-w-xl text-sm leading-5 text-slate-500">Revise os dados antes de salvar. A publicação será solicitada separadamente.</p>
                <button type="submit" className={primaryButton} disabled={submitting || imageChecking}>{submitting ? "Cadastrando…" : "Cadastrar como rascunho"}</button>
            </div>
        </form>}
    </div>;
}

export function AdminAccount() {
    const { user } = useAuth();
    const [passwordDialog, setPasswordDialog] = useState(false);
    const organization = user?.organizations?.find(item => item.id === user.organization_id);
    const initials = user?.name.trim().split(/\s+/).filter(Boolean).map(part => part[0]).filter((_, index, parts) => index === 0 || index === parts.length - 1).join("").toLocaleUpperCase("pt-BR");
    const profile = user?.role === "ROTALOG_ADMIN" ? "Administrador RotaLog" : user?.role || "Não informado";

    return <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader title="Minha conta" subtitle="Consulte seus dados pessoais, sua organização e as opções de segurança da conta."/>
        <section className={`${cardClass} overflow-hidden border-t-4 border-t-blue-700`} aria-label="Identificação da conta">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <span aria-hidden="true" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl font-bold text-blue-800 ring-1 ring-inset ring-blue-100">{initials || "—"}</span>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Conta administrativa</p>
                    <h2 className="mt-1 break-words text-xl font-bold text-slate-900 sm:text-2xl">{user?.name || "Não informado"}</h2>
                    <p className="mt-1 break-words text-sm text-slate-600">{user?.email || "Não informado"}</p>
                    <span className="mt-3 inline-flex max-w-full rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{profile}</span>
                </div>
            </div>
        </section>
        <div className="grid gap-6 md:grid-cols-2">
            <section className={`${cardClass} min-w-0`} aria-labelledby="admin-personal-title">
                <h2 id="admin-personal-title" className="text-lg font-bold text-slate-900">Dados pessoais</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Informações de identificação da sua conta.</p>
                <dl className="mt-5 space-y-4">
                    {[["Nome", user?.name], ["E-mail", user?.email]].map(([label, value]) => <div key={label} className="border-t border-slate-100 pt-4">
                        <dt className="text-sm text-slate-600">{label}</dt>
                        <dd className="mt-1 break-words text-sm font-semibold text-slate-900">{value || "Não informado"}</dd>
                    </div>)}
                </dl>
            </section>
            <section className={`${cardClass} min-w-0`} aria-labelledby="admin-access-title">
                <h2 id="admin-access-title" className="text-lg font-bold text-slate-900">Organização e acesso</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Vínculo e perfil associados à sessão atual.</p>
                <dl className="mt-5 space-y-4">
                    {[["Organização", organization?.name], ["Perfil", profile]].map(([label, value]) => <div key={label} className="border-t border-slate-100 pt-4">
                        <dt className="text-sm text-slate-600">{label}</dt>
                        <dd className="mt-1 break-words text-sm font-semibold text-slate-900">{value || "Não informado"}</dd>
                    </div>)}
                </dl>
            </section>
        </div>
        <p className="text-sm leading-6 text-slate-600">Nome, e-mail e organização são somente leitura.</p>
        <section className={cardClass} aria-labelledby="admin-security-title">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="max-w-xl">
                    <h2 id="admin-security-title" className="text-lg font-bold text-slate-900">Segurança</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">Proteja o acesso à sua conta. Ao alterar a senha, todas as sessões serão encerradas e será necessário entrar novamente.</p>
                </div>
                {authMode === "api" && <button type="button" onClick={() => setPasswordDialog(true)} className={`${secondaryButton} shrink-0`}>Alterar senha</button>}
            </div>
        </section>
        {passwordDialog && <PasswordChangeDialog onClose={() => setPasswordDialog(false)}/>}
    </div>;
}
