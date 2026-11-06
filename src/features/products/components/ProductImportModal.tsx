import { useRef, useState } from "react";
import { createSupplierProducts, getSupplierProducts } from "../services/supplierProducts.service";
import { downloadProductTemplate, readProductSpreadsheet, type ImportRow } from "../services/productSpreadsheet.service";
import { ProductManagementDialog } from "./ProductManagementDialog";

type Props = { organizationId: string; onClose: () => void; onSaved: () => void };
export function ProductImportModal({ organizationId, onClose, onSaved }: Props) {
    const [rows, setRows] = useState<ImportRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);
    const request = useRef(0);
    const valid = rows.filter((row) => !row.errors.length);
    async function select(file?: File) {
        const version = ++request.current;
        setRows([]); setError(null);
        if (!file) return;
        setBusy(true);
        try {
            const result = await readProductSpreadsheet(file, getSupplierProducts(organizationId));
            if (version === request.current) setRows(result);
        } catch (failure) { if (version === request.current) setError(failure instanceof Error ? failure.message : "Falha ao ler planilha."); }
        finally { if (version === request.current) setBusy(false); }
    }
    function confirm() {
        if (lock.current || busy || !valid.length) return;
        lock.current = true;
        try { createSupplierProducts(organizationId, valid.map((row) => row.product), "xlsx-import"); onSaved(); }
        catch (failure) { lock.current = false; setError(failure instanceof Error ? failure.message : "Falha ao importar. Nenhum produto foi salvo."); }
    }
    return <ProductManagementDialog title="Importar produtos XLSX" onClose={onClose}>
        <p className="mb-4 text-sm text-slate-600">Use a primeira aba com as colunas do modelo. Limite: 5 MB e 5.000 linhas. O modelo contém uma linha ilustrativa: substitua pelos seus produtos.</p>
        <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={async () => { try { await downloadProductTemplate(); } catch { setError("Não foi possível baixar o modelo."); } }} className="rounded-lg border px-3 py-2 text-sm text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600">Baixar modelo XLSX</button>
            <label className="text-sm">Planilha .xlsx<input type="file" accept=".xlsx" disabled={busy} onChange={(event) => { void select(event.target.files?.[0]); event.target.value = ""; }} className="block max-w-full text-xs" /></label>
        </div>
        {busy && <p role="status" className="mt-4 text-sm">Lendo e validando planilha…</p>}
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {rows.length > 0 && <>
            <p aria-live="polite" className="my-4 text-sm font-semibold">{valid.length} linhas válidas · {rows.length - valid.length} inválidas. Apenas as válidas serão importadas após confirmar.</p>
            <div role="region" aria-label="Rolagem da prévia de importação" tabIndex={0} className="max-h-72 overflow-auto rounded-lg border focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600"><table className="w-full min-w-[650px] text-left text-xs"><thead className="sticky top-0 bg-slate-100"><tr>{["Linha", "Código / Produto", "Categoria / Unidade", "Preço", "Estoque", "Validação"].map((title) => <th key={title} className="p-2">{title}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.line} className="border-t"><td className="p-2">{row.line}</td><td className="p-2">{row.product.id}<br />{row.product.name}</td><td className="p-2">{row.product.category} / {row.product.unit}</td><td className="p-2">{Number.isFinite(row.product.price) ? row.product.price.toFixed(2) : "Inválido"}</td><td className="p-2">{Number.isFinite(row.product.stock) ? row.product.stock : "Inválido"}</td><td className={`p-2 ${row.errors.length ? "text-red-700" : "text-green-700"}`}>{row.errors.join(" ") || "Válida"}</td></tr>)}</tbody></table></div>
        </>}
        <footer className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-600">Cancelar</button><button type="button" disabled={busy || !valid.length} onClick={confirm} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-40">Confirmar importação ({valid.length})</button></footer>
    </ProductManagementDialog>;
}
