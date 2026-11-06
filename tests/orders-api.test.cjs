const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto').webcrypto;
function load(path, dependencies = {}) {
    const module = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, { module, exports: module.exports, require: id => dependencies[id], crypto });
    return module.exports;
}
const adapter = load('src/features/orders/api/orderAdapter.ts');
const http = load('src/shared/api/http.ts', { './config': { apiUrl: '' } });
const { OrdersRepository, remainingAllocation, orderError } = load('src/features/orders/api/ordersRepository.ts', {
    '../../services/apiAuth.service': {}, '../../../shared/api/http': http, './orderAdapter': adapter,
});
const makeOrder = (id = 'one', state = 'AWAITING_SUPPLIER_DECISION', extra = {}) => ({
    id, state, supplier_organization_id: 'org', version: 3, accepts_partial: false,
    acceptance_deadline: '2099-01-01T00:00:00Z', total: '0.30', currency: 'BRL',
    allowed_actions: ['acceptance'], fulfillments: [],
    items: [{ id: 'line', unit_price: '0.10', product: {name: 'Produto'}, requested_quantity: 3, reserved_quantity: 3, supplier_accepted_quantity: 3 }], ...extra,
});
const page = (items, total = items.length, number = 1) => ({items,total,page:number,page_size:100});
(async () => {
    assert.equal(adapter.cents('999999999999.99'), 99999999999999n);
    assert.equal(adapter.cents('0.10') * 3n, adapter.cents('0.30'));
    assert.equal(adapter.formatMoney('0.30'), 'R$ 0,30');
    assert.throws(() => adapter.cents('0.001'));
    for (const [state, label] of Object.entries({AWAITING_SUPPLIER_DECISION:'Aguardando aceite', ACCEPTED:'Aceito', PARTIALLY_ACCEPTED:'Aceito parcialmente', SEPARATING:'Em separação', READY_TO_DISPATCH:'Pronto para coleta', IN_TRANSIT:'Em transporte', AWAITING_BUYER_RECEIPT:'Entrega informada — aguardando confirmação do comprador', DELIVERED:'Entregue', REFUSED:'Recusado', CANCELLED:'Cancelado', ACCEPTANCE_EXPIRED:'Aceite expirado', FUTURE_STATE:'FUTURE_STATE'})) {
        assert.equal(adapter.orderStateLabel(state), label);
        assert.equal(adapter.adaptOrder(makeOrder('one', state)).stateLabel, label);
        assert.equal(adapter.adaptOrder(makeOrder('one', state)).state, state);
    }
    for (const [state, stage] of Object.entries({IN_TRANSIT:'transport', AWAITING_BUYER_RECEIPT:'transport', DELIVERED:'delivered'})) {
        const order = makeOrder('22222222-2222-4222-8222-222222222222', state);
        assert.equal(adapter.adaptOrder(order).stage, stage);
        assert.equal(order.state, state);
        assert.equal(adapter.acceptanceOpen(order), false);
    }
    assert.equal(adapter.shortOrderId('22222222-2222-4222-8222-222222222222'), '22222222…22222222');
    assert.equal(adapter.shortOrderId('PED-001'), 'PED-001');
    const visualOrder = makeOrder('f1e10a37-78d7-4d53-828d-5122922dff46');
    const collision = makeOrder('f1e10a37-1234-4d53-828d-5122922dff46');
    assert.equal(adapter.orderLabel(visualOrder), 'Pedido #F1E10A37');
    assert.equal(adapter.orderLabel(visualOrder, [visualOrder, collision]), 'Pedido #F1E10A3778D7');
    assert.equal(adapter.orderLabel(visualOrder, [collision, visualOrder]), 'Pedido #F1E10A3778D7');
    assert.equal(adapter.orderLabel(collision, [visualOrder, collision]), 'Pedido #F1E10A371234');
    assert.equal(adapter.orderLabel({...visualOrder, order_number:' RL-2026-001 '}), 'Pedido RL-2026-001');
    assert.equal(adapter.orderLabel({...visualOrder, order_number:' '}), 'Pedido #F1E10A37');
    assert.equal(adapter.orderLabel({...visualOrder, order_number:null}), 'Pedido #F1E10A37');
    assert.equal(visualOrder.id, 'f1e10a37-78d7-4d53-828d-5122922dff46');
    for (const [state, stage] of Object.entries({AWAITING_SUPPLIER_DECISION:'new',ACCEPTED:'accepted',PARTIALLY_ACCEPTED:'accepted',SEPARATING:'separating',READY_TO_DISPATCH:'ready',REFUSED:'completed',CANCELLED:'completed',ACCEPTANCE_EXPIRED:'completed',FUTURE_STATE:'unknown'})) {
        assert.equal(adapter.adaptOrder(makeOrder('one',state)).stage,stage);
    }
    assert.equal(adapter.acceptanceOpen(makeOrder(), Date.parse('2100-01-01')), false);
    assert.equal(adapter.acceptanceOpen(makeOrder('one',undefined,{allowed_actions:[]})), false);
    assert.throws(() => adapter.assertQuantity(1.5,3));
    let calls = 0;
    const empty = new OrdersRepository('org', async () => { calls++; return page([]); });
    await Promise.all([empty.refresh(),empty.refresh()]);
    assert.equal(calls,1); assert.equal(empty.snapshot().loaded,true); assert.equal(empty.snapshot().orders.length,0);
    const hundreds = Array.from({length:100},(_,i)=>makeOrder(String(i)));
    const requests = [];
    const paginated = new OrdersRepository('org', async (path,options) => { requests.push({path,options}); return path.includes('page=1&') ? page(hundreds,101) : page([makeOrder('last','READY_TO_DISPATCH')],101,2); });
    await paginated.refresh();
    assert.equal(paginated.snapshot().orders.length,101); assert.equal(requests.length,2);
    assert.equal(requests[0].options.headers['X-Organization-Id'],'org');
    const metrics = adapter.orderMetrics(paginated.snapshot().orders);
    assert.equal(metrics[0].value,101); assert.equal(metrics[1].value,100); assert.equal(metrics[3].value,1);
    const brokenPage = new OrdersRepository('org', async path => path.includes('page=1&') ? page(hundreds,101) : page([hundreds[0]],101,2));
    await brokenPage.refresh(); assert.equal(brokenPage.snapshot().loaded,false); assert.equal(brokenPage.snapshot().orders.length,0);
    const wrongOrg = new OrdersRepository('other', async()=>page([makeOrder()]));
    await wrongOrg.refresh(); assert.match(wrongOrg.snapshot().error,/organização/);
    for (const status of [400,401,403,404,409,422]) {
        const error = new http.ApiError(status);
        assert.ok(orderError(error).length > 10);
        const failed = new OrdersRepository('org',async()=>{throw error;});
        await failed.refresh(); assert.equal(failed.snapshot().loaded,false); assert.equal(failed.snapshot().orders.length,0);
    }
    let posts = []; let fail = true;
    const writable = new OrdersRepository('org',async(path,options)=>{
        if(options.method==='POST') { posts.push({path,options}); if(fail) throw new Error('network'); return makeOrder(); }
        return page([makeOrder()]);
    });
    await assert.rejects(writable.accept(makeOrder(),[3]));
    fail=false; await writable.accept(makeOrder(),[3]);
    assert.equal(posts[0].options.headers['Idempotency-Key'],posts[1].options.headers['Idempotency-Key']);
    await writable.accept(makeOrder('one',undefined,{version:4}),[3]);
    assert.notEqual(posts[1].options.headers['Idempotency-Key'],posts[2].options.headers['Idempotency-Key']);
    await assert.rejects(writable.accept(makeOrder(),[1]));
    await assert.rejects(writable.start(makeOrder()));
    const batch = {id:'batch',supplier_order_id:'one',state:'SEPARATING',version:9,lines:[{id:'batch-line',order_item_id:'line',allocated_quantity:3,separated_quantity:3}]};
    const separating = makeOrder('one','SEPARATING',{version:7,allowed_actions:['fulfillments'],fulfillments:[batch]});
    assert.equal(remainingAllocation(separating,'line'),0);
    await writable.separate(separating,batch,[3]);
    assert.equal(JSON.parse(posts.at(-1).options.body).expected_version,9);
    await writable.ready(separating,batch);
    assert.equal(JSON.parse(posts.at(-1).options.body).expected_version,9);
    assert.equal(posts.at(-1).options.headers['Idempotency-Key'],undefined);
    await assert.rejects(writable.ready(separating,{...batch,lines:[{...batch.lines[0],separated_quantity:2}]}));
    let resolve;
    const oldSession = new OrdersRepository('org',()=>new Promise(done=>{resolve=done;}));
    const oldLoad = oldSession.refresh(); oldSession.deactivate(); resolve(page([makeOrder()])); await oldLoad;
    assert.equal(oldSession.snapshot().orders.length,0);
    await assert.rejects(oldSession.start(makeOrder('one','ACCEPTED',{allowed_actions:['start-separation']})));
    const newSession = new OrdersRepository('new-org',async()=>page([])); await newSession.refresh(); assert.equal(newSession.snapshot().orders.length,0);
    let detailReads=0;
    const detailRepo=new OrdersRepository('org',async()=>{detailReads++; return makeOrder();});
    await Promise.all([detailRepo.detail('one'),detailRepo.detail('one')]);
    assert.equal(detailReads,1);
    let releaseRead;
    let reads=0;
    const fresh=makeOrder('one','ACCEPTED',{allowed_actions:['start-separation']});
    const race=new OrdersRepository('org',async(path,options)=>{
        if(options.method==='POST') return fresh;
        reads++;
        if(reads===1) return new Promise(done=>{releaseRead=done;});
        return page([fresh]);
    });
    const initial=race.refresh();
    const accepted=race.accept(makeOrder(),[3]);
    releaseRead(page([makeOrder()]));
    await Promise.all([initial,accepted]);
    assert.equal(reads,2);
    assert.equal(race.snapshot().orders[0].state,'ACCEPTED');
    console.log('Orders API: pagination, empty/errors, exact money, states, metrics, deadlines, permissions, idempotency, versions and session isolation passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
