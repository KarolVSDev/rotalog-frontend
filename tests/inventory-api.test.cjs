const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(path,dependencies={},extras={}) {
    const module={exports:{}};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:id=>dependencies[id],URLSearchParams,Error,...extras});
    return module.exports;
}
let httpResponse;
const http=load('src/shared/api/http.ts',{'./config':{apiUrl:''}},{fetch:async()=>httpResponse});
const offers=load('src/features/products/api/offersRepository.ts',{'../../services/apiAuth.service':{},'../../../shared/api/http':http});
const {InventoryRepository,adjustmentValues,stockQuantity,inventoryError}=load('src/features/inventory/api/inventoryRepository.ts',{'../../services/apiAuth.service':{},'../../../shared/api/http':http,'../../products/api/offersRepository':offers});
const warehouse={id:'warehouse',supplier_organization_id:'org',is_active:true};
const offer={id:'offer',warehouse_id:'warehouse',supplier_organization_id:'org'};
const item={id:'balance',offer_id:'offer',warehouse_id:'warehouse',external_physical_quantity:null,external_sellable_quantity:20,rotalog_reserved_not_reflected_quantity:3,safety_stock_quantity:2,effective_sellable_quantity:15,version:4,source:'MANUAL',freshness_state:'FRESH',source_observed_at:'2026-10-22T12:00:00Z',received_at:'2026-10-22T12:00:00Z',demo_run_id:'demo'};
function transport(handler) {
    return async(path,options)=>{
        assert.equal(options.headers['X-Organization-Id'],'org');
        if(path.startsWith('/api/v1/warehouses'))return {items:[warehouse],total:1,page:1,page_size:100};
        if(path.startsWith('/api/v1/offers')){assert.equal(new URL(path,'http://local').searchParams.get('supplier_id'),'org');return {items:[offer],total:1,page:1,page_size:25};}
        return handler(path,options);
    };
}
(async()=>{
    assert.equal(stockQuantity('0'),0);assert.equal(stockQuantity('2147483647'),2147483647);
    for(const value of ['-1','1.5','1e2','2147483648',''])assert.throws(()=>stockQuantity(value));
    assert.throws(()=>adjustmentValues(item,'4','2','Contagem conferida'),/reservas/);
    assert.throws(()=>adjustmentValues(item,'20','2','oi'),/justificativa/);
    const calls=[];
    const repository=new InventoryRepository('org',transport(async(path,options)=>{
        calls.push({path,options});
        if(options.method==='POST'){
            const body=JSON.parse(options.body);
            return {...item,external_sellable_quantity:body.external_sellable_quantity,safety_stock_quantity:body.safety_stock_quantity,effective_sellable_quantity:77,version:5};
        }
        const page=Number(new URL(path,'http://local').searchParams.get('page'));
        return {items:[item],total:26,page,page_size:25};
    }));
    await repository.loadReferences();
    const result=await repository.list(2,{warehouseId:'warehouse',offerId:'offer'});
    assert.equal(result.items[0].external_physical_quantity,null);
    assert.match(calls[0].path,/warehouse_id=warehouse/);assert.match(calls[0].path,/offer_id=offer/);assert.match(calls[0].path,/page=2/);
    const adjusted=await repository.adjust(result.items[0],'25','4','  Conferência de saldo  ');
    assert.equal(adjusted.effective_sellable_quantity,77); // Never replaced by a browser calculation.
    assert.deepEqual(JSON.parse(calls.at(-1).options.body),{offer_id:'offer',warehouse_id:'warehouse',external_sellable_quantity:25,safety_stock_quantity:4,expected_version:4,reason:'Conferência de saldo'});
    await assert.rejects(repository.adjust(item,'25','4','Conferência de saldo'),/Atualize/);
    await assert.rejects(repository.list(1,{warehouseId:'other',offerId:''}),/autorizado/);
    await assert.rejects(repository.list(1,{warehouseId:'',offerId:'other'}),/autorizada/);
    for(const value of [{...item,warehouse_id:'other'},{...item,effective_sellable_quantity:-1},{...item,external_physical_quantity:undefined},null]){
        const invalid=new InventoryRepository('org',transport(async()=>({items:[value],total:1,page:1,page_size:25})));
        await invalid.loadReferences();await assert.rejects(invalid.list(1,{warehouseId:'',offerId:''}));
    }
    const unresolved=new InventoryRepository('org',transport(async()=>({items:[{...item,offer_id:'paused',effective_sellable_quantity:0}],total:1,page:1,page_size:25})));
    await unresolved.loadReferences();assert.equal((await unresolved.list(1,{warehouseId:'',offerId:''})).items[0].effective_sellable_quantity,0);
    for(const failure of [new Error('Falha de rede'),new http.ApiError(409,{code:'VERSION_CONFLICT',requestId:'request-123'}),new http.ApiError(422)]){
        let posts=0;
        const failing=new InventoryRepository('org',transport(async(path,options)=>{if(options.method==='POST'){posts++;throw failure;}return {items:[item],total:1,page:1,page_size:25};}));
        await failing.loadReferences();const row=(await failing.list(1,{warehouseId:'',offerId:''})).items[0];
        await assert.rejects(failing.adjust(row,'22','2','Conferência do saldo'));
        await assert.rejects(failing.adjust(row,'22','2','Conferência do saldo'),/Atualize/);
        assert.equal(posts,1);
    }
    assert.match(inventoryError(new http.ApiError(409,{code:'INVENTORY_BELOW_RESERVED',requestId:'request-123'})),/reservas.*request-123/);
    httpResponse={ok:false,status:409,json:async()=>({error:{code:'VERSION_CONFLICT',message:'internal text not displayed',request_id:'req-123',details:{expected_version:4}}})};
    await assert.rejects(http.request('/inventory'),error=>error.status===409&&error.code==='VERSION_CONFLICT'&&error.requestId==='req-123'&&error.details.expected_version===4&&!error.message.includes('internal text'));
    httpResponse={ok:false,status:500,json:async()=>{throw new Error('not json');}};
    await assert.rejects(http.request('/inventory'),error=>error.status===500);
    console.log('Inventory API: filters, paging, backend balances, nullable physical, ownership, adjustments, versions, uncertain writes and structured errors passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
