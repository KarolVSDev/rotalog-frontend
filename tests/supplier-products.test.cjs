const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const ExcelJS = require('exceljs');
const storage = new Map();
const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
function load(path, dependencies = {}) {
    const module = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, { module, exports: module.exports, require: id => dependencies[id] ?? require(id), localStorage, window: { dispatchEvent() {} }, Event: class {}, Blob, URL, Uint8Array, setTimeout });
    return module.exports;
}
async function run() {
    const mocks = load('src/features/products/mocks/products.mock.ts');
    const service = load('src/features/products/services/supplierProducts.service.ts', { '../mocks/products.mock': mocks, '../../inventory/services/stockMovements': load('src/features/inventory/services/stockMovements.ts') });
    const sheetService = load('src/features/products/services/productSpreadsheet.service.ts', { './supplierProducts.service': service });
    const org = 'fornecedor-001';
    const initial = JSON.stringify(service.getSupplierProducts(org));
    const input = { id: 'NOVO-001', name: 'Novo produto', category: 'Categoria', unit: 'kg', price: 10.5, stock: 2.5 };
    assert.throws(() => service.createSupplierProducts(org, [{ ...input, price: 0 }]));
    assert.throws(() => service.createSupplierProducts(org, [{ ...input, stock: -1 }]));
    assert.equal(JSON.stringify(service.getSupplierProducts(org)), initial);
    const created = service.createSupplierProducts(org, [input]);
    assert.equal(created.length, JSON.parse(initial).length + 1);
    assert.equal(service.getSupplierProducts(org).find(p => p.id === input.id).stock, 2.5);
    const initialMovement = created.find(p => p.id === input.id).stockMovements;
    assert.equal(initialMovement.length, 1);
    assert.equal(initialMovement[0].type, 'initial-stock');
    assert.equal(initialMovement[0].quantity, 2.5);
    assert.equal(initialMovement[0].source, 'product-create');
    assert.throws(() => service.createSupplierProducts(org, [{ ...input, id: ' novo-001 ' }]));
    assert.throws(() => service.createSupplierProducts(org, [{ ...input, id: 'BATCH' }, input]));
    assert.ok(!service.getSupplierProducts(org).some(p => p.id === 'BATCH'));
    assert.ok(!service.getSupplierProducts('fornecedor-002').some(p => p.id === input.id));
    service.createSupplierProducts('fornecedor-002', [input]);
    const edited = service.editSupplierProduct(org, input.id, { ...input, id: 'RENAMED', organizationId: 'other', stock: 999, name: 'Editado' });
    const product = edited.find(p => p.id === input.id);
    assert.equal(product.name, 'Editado');
    assert.equal(product.stock, 2.5);
    assert.equal(product.organizationId, org);
    assert.equal(JSON.stringify(product.stockMovements), JSON.stringify(initialMovement), 'metadata editing preserves history without adding events');
    assert.throws(() => service.editSupplierProduct('other', input.id, input));
    const preview = sheetService.validateImportRows([
        { line: 2, values: ['X', 'Nome', 'Categoria', 'kg', '10,50', 0] },
        { line: 3, values: [' x ', 'Nome', 'Categoria', 'kg', 1, 2] },
        { line: 4, values: ['NOVO-001', 'Nome', 'Categoria', 'kg', 1, 2] },
        { line: 5, values: ['Y', 'Nome', 'Categoria', 'kg', '', -1] },
    ], service.getSupplierProducts(org));
    assert.ok(preview.every(row => row.errors.length > 0));
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Produtos');
    sheet.addRow(Array.from(sheetService.productColumns));
    sheet.addRow(['IMPORT-001', 'Importado', 'Categoria', 'Unidade', 20, 0]);
    sheet.addRow(['FORMULA', 'Produto', 'Categoria', 'kg', { formula: '10+10', result: 20 }, 1]);
    const data = await workbook.xlsx.writeBuffer();
    const file = { name: 'produtos.xlsx', size: data.length, arrayBuffer: async () => data };
    const rows = await sheetService.readProductSpreadsheet(file, service.getSupplierProducts(org));
    assert.equal(rows[0].errors.length, 0);
    assert.ok(rows[1].errors.length > 0);
    service.createSupplierProducts(org, rows.filter(row => !row.errors.length).map(row => row.product));
    assert.equal(service.getSupplierProducts(org).find(p => p.id === 'IMPORT-001').stockMovements, undefined, 'zero initial stock does not create a movement');
    const imported = service.createSupplierProducts(org, [{ ...input, id: 'XLSX-STOCK', stock: 3 }], 'xlsx-import').find(p => p.id === 'XLSX-STOCK');
    assert.equal(imported.stockMovements[0].source, 'xlsx-import');
    assert.ok((await sheetService.readProductSpreadsheet(file, service.getSupplierProducts(org)))[0].errors.length > 0);
    await assert.rejects(() => sheetService.readProductSpreadsheet({ ...file, name: 'arquivo.csv' }, []));
    await assert.rejects(() => sheetService.readProductSpreadsheet({ ...file, size: 6 * 1024 * 1024 }, []));
    sheet.getCell('A1').value = 'Coluna incorreta';
    const invalidBuffer = await workbook.xlsx.writeBuffer();
    await assert.rejects(() => sheetService.readProductSpreadsheet({ ...file, arrayBuffer: async () => invalidBuffer }, []));
    storage.set('rotalog:supplier-products:v1:' + org, 'invalid');
    assert.throws(() => service.createSupplierProducts(org, [{ ...input, id: 'FAIL' }]));
    assert.equal(storage.get('rotalog:supplier-products:v1:' + org), 'invalid');
    console.log('Produtos: cadastro, validação, edição sem alterar estoque, isolamento, XLSX real, duplicidade e atomicidade OK');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
