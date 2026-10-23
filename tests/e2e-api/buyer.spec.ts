import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const organization='buyer-org';
const product={id:'official-product',name:'Arroz oficial',brand:'Marca oficial',category:'ALIMENTO_SECO_INDUSTRIALIZADO',gtin:null,net_content:1000,net_content_unit:'g',packaging_type:'Fardo',packaging_quantity:6,gross_weight_grams:6200,volume_cm3:1000,variant_attributes:{},publication_state:'PUBLISHED',version:1,demo_run_id:'demo',is_synthetic:true};
const offer={id:'offer-one',product_id:product.id,product_name:product.name,supplier_organization_id:'supplier-org',supplier_name:'Distribuidora oficial',warehouse_id:'warehouse',unit_price:'149.90',currency:'BRL',minimum_order_quantity:2,available_quantity:20,version:1,is_active:true};
const slot={id:'slot',warehouse_id:'warehouse',starts_at:'2026-01-01T00:00:00Z',ends_at:'2099-01-01T00:00:00Z',total_quantity:100,reserved_quantity:0};
const order={id:'supplier-order',purchase_id:'purchase',buyer_organization_id:organization,supplier_organization_id:'supplier-org',warehouse_id:'warehouse',state:'AWAITING_SUPPLIER_DECISION',total:'299.80',items:[{id:'item',offer_id:offer.id,product,unit_price:'149.90',requested_quantity:2,supplier_accepted_quantity:0,separated_quantity:0,dispatched_quantity:0,delivered_quantity:0}],fulfillments:[],allowed_actions:[],version:1};
async function setup(page:Page,restore=true) {
    const state={role:'BUYER_ADMIN' as 'BUYER_ADMIN'|'SUPPLIER_OPERATOR',capabilities:['catalog:read','checkout:create','purchase:read'],org:organization,products:[product],offers:[offer],delayOffers:0,network:false,createFail:0,createStatus:0,payFail:0,payStatus:0,purchaseStatus:0,emptyPurchases:false,foreign:false,created:[] as {key:string;body:unknown}[],payments:[] as {key:string;body:unknown}[],confirmed:false,checkoutVersion:1,expired:false,unknown:[] as string[]};
    if(restore)await page.addInitScript(()=>sessionStorage.setItem('rotalog:api-csrf','test-csrf'));
    await page.route('http://localhost:8000/**',async route=>{
        const request=route.request(),url=new URL(request.url()),path=url.pathname;
        const user={id:state.role==='BUYER_ADMIN'?'buyer':'supplier',name:'Usuário Sintético',email:'user@example.invalid',role:state.role,organization_id:state.org,organizations:[{id:state.org,name:'Organização Sintética',role:state.role}],capabilities:state.capabilities,demo_run_id:'demo',is_synthetic:true};
        const checkout=()=>({id:'checkout',state:state.confirmed?'CONVERTED':state.expired?'EXPIRED':'READY_FOR_PAYMENT',version:state.checkoutVersion,supplier_organization_id:'supplier-org',warehouse_id:'warehouse',capacity_slot_id:slot.id,expires_at:state.expired?'2020-01-01T00:00:00Z':'2099-01-01T00:00:00Z',total:'299.80',currency:'BRL',items:[{offer_id:offer.id,quantity:2,unit_price:'149.90',product}],purchase_id:state.confirmed?'purchase':null,is_synthetic:true});
        const purchase={id:'purchase',checkout_id:'checkout',state:'ACTIVE',supplier_orders:[{...order,buyer_organization_id:state.foreign?'another-org':state.org}],is_synthetic:true};
        const list=(items:unknown[])=>({items,total:items.length,page:Number(url.searchParams.get('page')??1),page_size:Number(url.searchParams.get('page_size')??25),is_synthetic:true});
        if(path.endsWith('/auth/login')||path.endsWith('/auth/refresh'))return route.fulfill({json:{access_token:'test',token_type:'bearer',expires_in:600,csrf_token:'test-csrf',refresh_token:null,user}});
        if(path==='/api/v1/me')return route.fulfill({json:user});
        if(path.endsWith('/auth/logout'))return route.fulfill({status:204});
        expect(request.headers()['authorization']).toBe('Bearer test');
        expect(request.headers()['x-organization-id']).toBe(state.org);
        if(state.network)return route.abort();
        if(path==='/api/v1/products')return route.fulfill({json:list(state.products)});
        if(path===`/api/v1/products/${product.id}`)return route.fulfill({json:product});
        if(path==='/api/v1/offers'){if(state.delayOffers)await new Promise(resolve=>setTimeout(resolve,state.delayOffers));return route.fulfill({json:list(state.offers)});}
        if(path==='/api/v1/supplier-orders')return route.fulfill({json:list(state.confirmed?[{...order,acceptance_deadline:'2099-01-01T00:00:00Z',accepts_partial:false,currency:'BRL',is_synthetic:true}]:[])});
        if(path==='/api/v1/supplier-orders/supplier-order')return route.fulfill({json:{...order,acceptance_deadline:'2099-01-01T00:00:00Z',accepts_partial:false,currency:'BRL',is_synthetic:true}});
        if(path==='/api/v1/capacity-slots')return route.fulfill({json:list([slot])});
        if(path==='/api/v1/checkouts'&&request.method()==='POST'){
            state.created.push({key:request.headers()['idempotency-key'],body:request.postDataJSON()});
            if(state.createStatus)return route.fulfill({status:state.createStatus,json:{error:{code:'INSUFFICIENT_INVENTORY'}}});
            if(state.createFail-- >0)return route.abort();
            return route.fulfill({status:201,json:checkout()});
        }
        if(path==='/api/v1/checkouts/checkout')return route.fulfill({json:checkout()});
        if(path==='/api/v1/checkouts/checkout/confirm-payment'){
            state.payments.push({key:request.headers()['idempotency-key'],body:request.postDataJSON()});
            if(state.payStatus)return route.fulfill({status:state.payStatus,json:{error:{code:state.payStatus===401?'SESSION_EXPIRED':'VERSION_CONFLICT'}}});
            if(state.payFail-- >0)return route.abort();
            state.confirmed=true;
            return route.fulfill({json:{purchase_id:'purchase',supplier_order_ids:['supplier-order'],payment_id:'payment',payment_state:'CAPTURED',provider:'SIMULATED',total:'299.80',currency:'BRL',is_synthetic:true}});
        }
        if(path==='/api/v1/purchases')return route.fulfill({json:list(state.emptyPurchases?[]:[purchase])});
        if(path==='/api/v1/purchases/purchase')return state.purchaseStatus?route.fulfill({status:state.purchaseStatus,json:{error:{code:'PURCHASE_NOT_FOUND'}}}):route.fulfill({json:purchase});
        state.unknown.push(`${request.method()} ${path}`);
        return route.abort();
    });
    return state;
}
async function add(page:Page) {
    await page.goto(`/produto/${product.id}`);
    await page.getByRole('button',{name:'Adicionar ao carrinho',exact:true}).first().click();
    await expect(page.getByRole('status')).toContainText('Oferta adicionada');
    await page.goto('/comprador/carrinho');
}
async function reserve(page:Page) {
    await page.getByLabel('Janela de capacidade',{exact:true}).selectOption('slot');
    await page.getByRole('button',{name:'Criar reserva e revisar compra'}).click();
}
test('login comprador, catálogo e compra real com confirmação explícita e histórico',async({page})=>{
    const state=await setup(page,false);
    await page.goto('/login');
    await page.getByLabel('E-mail',{exact:true}).fill('buyer@example.invalid');
    await page.getByLabel('Senha',{exact:true}).fill('synthetic-only-password');
    await page.getByRole('button',{name:'Entrar',exact:true}).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading',{name:product.name,exact:true})).toBeVisible();
    await expect(page.getByText('R$ 149,90',{exact:true}).first()).toBeVisible();
    await add(page);await reserve(page);
    await expect(page.getByText('Total oficial:',{exact:true}).locator('..')).toContainText('R$ 299,80');
    expect(state.payments).toHaveLength(0);
    expect(state.created[0].body).toEqual({items:[{offer_id:offer.id,quantity:2}],capacity_slot_id:'slot',accepts_partial:false});
    await page.getByRole('button',{name:'Confirmar pagamento sintético'}).click();
    await expect(page).toHaveURL(/comprador\/compras\/purchase$/);
    await expect(page.getByText('Aguardando', {exact:false}).first()).toBeVisible();
    expect(state.payments).toHaveLength(1);
    expect(state.payments[0].body).toEqual({expected_version:1});
    await page.getByText('Identificadores para acompanhamento').click();
    await expect(page.getByText('Pedido do fornecedor: supplier-order')).toBeVisible();
    await page.goto('/comprador/compras');
    await expect(page.getByRole('link',{name:/Ver detalhes/}).first()).toBeVisible();
    expect(state.unknown).toEqual([]);
});
test('criação incerta não é repetida automaticamente e recupera a mesma chave após recarga',async({page})=>{
    const state=await setup(page);state.createFail=1;
    await add(page);await reserve(page);
    await expect(page.getByRole('button',{name:'Recuperar criação com a mesma chave'})).toBeEnabled();
    expect(state.created).toHaveLength(1);
    await page.reload();
    await page.getByRole('button',{name:'Recuperar criação com a mesma chave'}).click();
    await expect(page.getByText('Total oficial:')).toBeVisible();
    expect(state.created).toHaveLength(2);
    expect(state.created[1]).toEqual(state.created[0]);
    expect(state.payments).toHaveLength(0);
});
test('pagamento incerto exige consulta e ação explícita, preservando idempotência',async({page})=>{
    const state=await setup(page);state.payFail=1;
    await add(page);await reserve(page);
    await page.getByRole('button',{name:'Confirmar pagamento sintético'}).click();
    await expect(page.getByRole('alert').filter({hasText:'Resultado ainda'})).toBeVisible();
    await expect(page.getByRole('button',{name:'Consultar resultado'})).toBeEnabled();
    expect(state.payments).toHaveLength(1);
    await page.getByRole('button',{name:'Consultar resultado'}).click();
    await page.getByRole('button',{name:'Confirmar pagamento sintético'}).click();
    await expect(page).toHaveURL(/compras\/purchase$/);
    expect(state.payments[1]).toEqual(state.payments[0]);
});
test('pagamento processado com resposta perdida é encontrado sem novo pagamento',async({page})=>{
    const state=await setup(page);state.payFail=1;
    await add(page);await reserve(page);
    await page.getByRole('button',{name:'Confirmar pagamento sintético'}).click();
    await expect(page.getByRole('alert').filter({hasText:'Resultado ainda'})).toBeVisible();await expect(page.getByRole('button',{name:'Consultar resultado'})).toBeEnabled();state.confirmed=true;
    await page.getByRole('button',{name:'Consultar resultado'}).click();
    await expect(page).toHaveURL(/compras\/purchase$/);expect(state.payments).toHaveLength(1);
});
test('expiração confirmada permite revisão sem afirmar cancelamento local',async({page})=>{
    const state=await setup(page);
    await add(page);await reserve(page);state.expired=true;
    await page.getByRole('button',{name:'Consultar resultado'}).click();
    await expect(page.getByRole('button',{name:'Confirmar pagamento sintético'})).toHaveCount(0);
    await expect(page.getByText('Prazo da reserva encerrado.')).toBeVisible();
    await page.getByRole('button',{name:'Revisar carrinho após expiração confirmada'}).click();
    await expect(page.getByRole('button',{name:'Criar reserva e revisar compra'})).toBeVisible();
    expect(state.payments).toHaveLength(0);
});
test('mudança de versão exige nova revisão antes de pagar',async({page})=>{
    const state=await setup(page);await add(page);await reserve(page);await expect(page.getByText('Total oficial:')).toBeVisible();state.checkoutVersion=2;
    await page.getByRole('button',{name:'Confirmar pagamento sintético'}).click();
    await expect(page.getByRole('alert')).toContainText('versão mudaram');expect(state.payments).toHaveLength(0);
    await page.getByRole('button',{name:'Confirmar pagamento sintético'}).click();
    await expect(page).toHaveURL(/compras\/purchase$/);expect(state.payments[0].body).toEqual({expected_version:2});
});
test('comprador não acessa fornecedor; capacidade ausente bloqueia checkout',async({page})=>{
    const state=await setup(page);state.capabilities=['catalog:read','purchase:read'];
    await page.goto('/fornecedor/pedidos');await expect(page).toHaveURL(/\/$/);
    await page.goto('/comprador/carrinho');await expect(page.getByRole('alert')).toContainText('Acesso não autorizado');expect(state.created).toHaveLength(0);
});
test('compra de outra organização e 404 não exibem seus itens',async({page})=>{
    const state=await setup(page);state.foreign=true;
    await page.goto('/comprador/compras/purchase');await expect(page.getByRole('alert')).toContainText('não acessível');
    await expect(page.getByText('Total oficial:')).toHaveCount(0);
    state.foreign=false;state.purchaseStatus=404;
    await page.getByRole('button',{name:'Tentar novamente'}).click();await expect(page.getByRole('alert')).toContainText('não encontrado');
});
test('nova organização não herda carrinho nem reserva anterior',async({page})=>{
    const state=await setup(page);await add(page);state.org='another-buyer-org';
    await page.reload();await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible();expect(state.created).toHaveLength(0);
});
test('limites de quantidade e confirmação para substituir origem',async({page})=>{
    const state=await setup(page);state.offers=[offer,{...offer,id:'other',supplier_organization_id:'other',supplier_name:'Outro fornecedor'}];
    await page.goto(`/produto/${product.id}`);
    await page.getByRole('button',{name:'Adicionar ao carrinho',exact:true}).first().click();
    await page.getByRole('button',{name:'Adicionar ao carrinho',exact:true}).last().click();
    await expect(page.getByText('Esta oferta é de outro fornecedor ou depósito.')).toBeVisible();
    await page.getByRole('button',{name:'Manter itens',exact:true}).click();
    await page.goto('/comprador/carrinho');
    await page.getByLabel('Quantidade de Arroz oficial',{exact:true}).fill('1');
    await expect(page.getByRole('alert')).toContainText('quantidade mínima');expect(state.created).toHaveLength(0);
});
test('mobile: catálogo, detalhes e carrinho sem transbordamento horizontal',async({page})=>{
    await setup(page);await page.setViewportSize({width:390,height:844});
    for(const path of ['/',`/produto/${product.id}`]){
        await page.goto(path);await expect(page.getByRole('heading',{name:product.name,exact:true})).toBeVisible();
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    }
    await page.getByRole('button',{name:'Adicionar ao carrinho',exact:true}).click();await page.goto('/comprador/carrinho');
    await expect(page.getByRole('heading',{name:'Meu carrinho',exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('catálogo vazio, falha de comunicação e histórico vazio não usam mocks',async({page})=>{
    const state=await setup(page);state.products=[];
    await page.goto('/');await expect(page.getByRole('heading',{name:'Nenhum produto publicado encontrado'})).toBeVisible();
    state.emptyPurchases=true;await page.goto('/comprador/compras');await expect(page.getByText('Nenhuma compra encontrada para sua organização.')).toBeVisible();
    state.network=true;await page.reload();await expect(page.getByRole('alert')).toContainText('conectar');
    state.network=false;await page.getByRole('button',{name:'Tentar novamente'}).click();await expect(page.getByText('Nenhuma compra encontrada para sua organização.')).toBeVisible();
    expect(state.created).toHaveLength(0);
});
test('rejeição definitiva de estoque permite corrigir sem manter reserva fictícia',async({page})=>{
    const state=await setup(page);state.createStatus=409;
    await add(page);await reserve(page);
    await expect(page.getByRole('alert')).toContainText('Estoque insuficiente');
    await expect(page.getByRole('button',{name:'Criar reserva e revisar compra'})).toBeVisible();
    expect(state.created).toHaveLength(1);expect(state.payments).toHaveLength(0);
});
test('401 no pagamento encerra sessão e não reenvia a operação',async({page})=>{
    const state=await setup(page);await add(page);await reserve(page);state.payStatus=401;
    await page.getByRole('button',{name:'Confirmar pagamento sintético'}).click();
    await expect(page).toHaveURL(/\/login$/);expect(state.payments).toHaveLength(1);
});
test('visitante recebe orientação de login sem produtos fictícios',async({page})=>{
    const state=await setup(page,false);await page.goto('/');
    await expect(page.getByText('Entre para consultar produtos, preços e disponibilidade atualizados.')).toBeVisible();
    await expect(page.getByRole('heading',{name:product.name,exact:true})).toHaveCount(0);expect(state.created).toHaveLength(0);
});
for(const width of [1440,390])test(`revisão visual do comprador em ${width}px`,async({page},testInfo)=>{
    await setup(page);await page.setViewportSize({width,height:900});
    await page.goto('/');await expect(page.getByRole('heading',{name:product.name,exact:true})).toBeVisible();
    await page.screenshot({path:testInfo.outputPath(`buyer-catalog-${width}.png`),fullPage:true});
    await add(page);await reserve(page);await expect(page.getByText('Total oficial:')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`buyer-checkout-${width}.png`),fullPage:true});
    await page.getByRole('button',{name:'Confirmar pagamento sintético'}).click();await expect(page).toHaveURL(/compras\/purchase$/);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`buyer-purchase-${width}.png`),fullPage:true});
});
test('compra confirmada pode ser correlacionada ao pedido no portal do fornecedor',async({page})=>{
    const state=await setup(page);await add(page);await reserve(page);
    await page.getByRole('button',{name:'Confirmar pagamento sintético'}).click();await expect(page).toHaveURL(/compras\/purchase$/);
    await page.getByRole('button',{name:'Sair',exact:true}).click();await expect(page).toHaveURL(/\/login$/);
    state.role='SUPPLIER_OPERATOR';state.org='supplier-org';state.capabilities=['catalog:read','offer:write','inventory:write','supplier_order:manage'];
    await page.getByLabel('E-mail',{exact:true}).fill('supplier@example.invalid');await page.getByLabel('Senha',{exact:true}).fill('synthetic-only-password');
    await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page).toHaveURL(/\/fornecedor$/);
    await page.goto('/fornecedor/pedidos');await expect(page.getByText(product.name,{exact:false}).first()).toBeVisible();
    await expect(page.getByRole('region',{name:'Rolagem do quadro de pedidos'})).toContainText('299,80');
    expect(state.payments).toHaveLength(1);expect(state.unknown).toEqual([]);
});
test('logout durante revalidação não cria reserva com sessão anterior',async({page})=>{
    const state=await setup(page);await add(page);state.delayOffers=700;
    const response=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/offers');
    await reserve(page);await page.getByRole('button',{name:'Sair',exact:true}).click();await expect(page).toHaveURL(/\/login$/);
    await response;expect(state.created).toHaveLength(0);expect(state.payments).toHaveLength(0);
});
test('rejeição definitiva durante recuperação libera somente o formulário local',async({page})=>{
    const state=await setup(page);state.createFail=1;
    await add(page);await reserve(page);await expect(page.getByRole('button',{name:'Recuperar criação com a mesma chave'})).toBeEnabled();
    state.createStatus=409;await page.getByRole('button',{name:'Recuperar criação com a mesma chave'}).click();
    await expect(page.getByRole('alert')).toContainText('Estoque insuficiente');
    await expect(page.getByRole('button',{name:'Criar reserva e revisar compra'})).toBeVisible();
    expect(state.created[1]).toEqual(state.created[0]);expect(state.payments).toHaveLength(0);
});
test('histórico rejeita resposta com pedidos de outra organização',async({page})=>{
    const state=await setup(page);state.foreign=true;
    await page.goto('/comprador/compras');await expect(page.getByRole('alert')).toContainText('não acessível');
    await expect(page.getByRole('link',{name:/Ver detalhes/})).toHaveCount(0);
});
for(const width of [1440,390])test(`compras refinadas: rótulos, quantidades e logística honesta em ${width}px`,async({page},testInfo)=>{
    const state=await setup(page);await page.setViewportSize({width,height:900});await page.goto('/comprador/compras');
    await expect(page.getByText('Em andamento',{exact:true})).toBeVisible();
    await expect(page.getByText('Estado oficial: ACTIVE',{exact:true})).not.toBeVisible();
    await expect(page.getByText('Aguardando aceite',{exact:false}).first()).toBeVisible();
    await page.screenshot({path:testInfo.outputPath(`purchase-history-${width}.png`),fullPage:true});
    await page.getByRole('link',{name:/Ver detalhes/}).click();
    await expect(page.getByRole('link',{name:'Voltar às compras'})).toBeVisible();
    await expect(page.getByRole('region',{name:'Situação comercial da compra'})).toContainText('Em andamento');
    await expect(page.getByRole('region',{name:'Progresso da preparação'})).toContainText('Aguardando fornecedor');
    await expect(page.getByText('Total oficial do pedido')).toBeVisible();
    await page.getByText('Detalhes do pedido e quantidades').click();
    for(const label of ['Produtos e quantidades','Lotes de atendimento'])await expect(page.getByRole('region',{name:label,exact:true})).toBeVisible();
    await expect(page.getByText('não confirma coleta, transporte ou entrega')).toBeVisible();
    await expect(page.getByRole('link',{name:/GPS|comprovante|rastrear/i})).toHaveCount(0);
    await expect(page.getByRole('button',{name:/receber|confirmar entrega/i})).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`purchase-details-${width}.png`),fullPage:true});
    const accessibility=await new AxeBuilder({page}).analyze();expect(accessibility.violations).toEqual([]);
    expect(state.created).toHaveLength(0);expect(state.payments).toHaveLength(0);expect(state.unknown).toEqual([]);
});
