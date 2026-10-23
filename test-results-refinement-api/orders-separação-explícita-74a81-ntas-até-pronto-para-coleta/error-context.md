# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: orders.spec.ts >> separação explícita com versões distintas até pronto para coleta
- Location: tests\e2e-api\orders.spec.ts:184:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog').getByRole('region', { name: 'Lotes de atendimento' }).getByText('Em separação · Versão do lote: 2')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('dialog').getByRole('region', { name: 'Lotes de atendimento' }).getByText('Em separação · Versão do lote: 2') with timeout 5000ms
  - waiting for getByRole('dialog').getByRole('region', { name: 'Lotes de atendimento' }).getByText('Em separação · Versão do lote: 2')

```

```yaml
- link "Ir para o conteúdo":
  - /url: "#supplier-main-content"
- complementary:
  - link "RotaLog":
    - /url: /fornecedor
  - paragraph: ÁREA DO FORNECEDOR
  - navigation "Menu principal":
    - link "Dashboard":
      - /url: /fornecedor
    - link "Pedidos":
      - /url: /fornecedor/pedidos
    - link "Produtos":
      - /url: /fornecedor/produtos
    - link "Estoque":
      - /url: /fornecedor/estoque
    - link "Rotas":
      - /url: /fornecedor/rotas
  - link "Minha conta":
    - /url: /fornecedor/conta
  - paragraph: Organização sintética
  - button "Sair"
- banner:
  - text: Portal do fornecedor
  - group:
    - strong: Fornecedor do teste
    - text: Organização sintética · Fornecedor
- main:
  - paragraph: Ambiente de demonstração · Dados sintéticos consultados na API
  - region "Pesquisa e filtros de pedidos":
    - heading "Quadro de pedidos" [level=1]
    - paragraph: 1 pedidos ativos · 0 aguardando aceite
    - text: Pesquisar pedido, produto ou organização compradora
    - searchbox "Pesquisar pedido, produto ou organização compradora"
    - text: Filtrar estado
    - combobox "Filtrar estado":
      - option "Todos os estados" [selected]
      - option "Em separação"
    - button "Atualizar pedidos"
  - group: Sobre o histórico de pedidos
  - tablist "Visualização dos pedidos":
    - tab "Pedidos ativos (1)" [selected]
    - tab "Histórico (0)"
  - tabpanel "Pedidos ativos (1)":
    - region "Rolagem do quadro de pedidos":
      - region "Novos":
        - heading "Novos" [level=2]
        - text: "0"
        - paragraph: Nenhum pedido nesta etapa
      - region "Aceitos":
        - heading "Aceitos" [level=2]
        - text: "0"
        - paragraph: Nenhum pedido nesta etapa
      - region "Em separação":
        - heading "Em separação" [level=2]
        - text: "1"
        - article:
          - 'heading "Pedido #22222222" [level=3]'
          - text: Em separação
          - paragraph: 1 linhas · 3 unidades solicitadas
          - paragraph: Arroz do pedido (3)
          - paragraph: R$ 0,30
          - button "Ver detalhes do pedido 22222222-2222-4222-8222-222222222222": Ver detalhes
          - paragraph: Preparação em andamento. Confira os lotes e as quantidades separadas.
      - region "Prontos para coleta":
        - heading "Prontos para coleta" [level=2]
        - text: "0"
        - paragraph: Nenhum pedido nesta etapa
      - region "Em transporte":
        - heading "Em transporte" [level=2]
        - text: "0"
        - paragraph: Nenhum pedido nesta etapa
      - region "Entregues":
        - heading "Entregues" [level=2]
        - text: "0"
        - paragraph: Nenhum pedido nesta etapa
    - paragraph: Deslize para visualizar as etapas. Abra os detalhes para revisar e confirmar operações.
- contentinfo: RotaLog © 2026 — Todos os direitos reservados.
- dialog "Detalhes do pedido":
  - banner:
    - heading "Detalhes do pedido" [level=2]
    - button "Fechar"
  - button "Atualizar pedido e revisar"
  - region "Resumo do pedido":
    - heading "Informações comerciais" [level=3]
    - term: Pedido
    - definition: "Pedido #22222222"
    - term: Estado
    - definition: Em separação
    - term: Valor solicitado
    - definition: R$ 0,30
    - term: Aceite parcial permitido
    - definition: Não
  - region "Situação atual":
    - heading "Situação atual" [level=3]
    - paragraph: Preparação em andamento. Confira os lotes e as quantidades separadas.
    - paragraph: "Prazo para aceite: 31/12/2098, 20:00:00 AMT."
  - region "Produtos e quantidades":
    - table "Produtos e quantidades":
      - caption: Produtos e quantidades
      - rowgroup:
        - row "Produto Solicitado Reservado Aceito / recusado Separado Preço unitário":
          - columnheader "Produto"
          - columnheader "Solicitado"
          - columnheader "Reservado"
          - columnheader "Aceito / recusado"
          - columnheader "Separado"
          - columnheader "Preço unitário"
      - rowgroup:
        - row "Arroz do pedido 1 un · Pacote 3 3 3 / 0 3 R$ 0,10":
          - rowheader "Arroz do pedido 1 un · Pacote"
          - cell "3"
          - cell "3"
          - cell "3 / 0"
          - cell "3"
          - cell "R$ 0,10"
  - paragraph: Quantidades informadas pelo pedido. Consulte os lotes para acompanhar a preparação.
  - region "Ações do pedido":
    - heading "Ações do pedido" [level=3]
  - region "Lotes de atendimento":
    - heading "Atendimento e separação" [level=3]
    - article:
      - heading "Lote batch" [level=4]
      - paragraph: Em separação
      - paragraph: 3 alocados / 3 separados
      - list:
        - listitem: "Arroz do pedido: 3 separados / 3 alocados"
      - button "Registrar separação do lote"
      - button "Marcar lote como pronto"
  - region "Situação logística":
    - heading "Situação logística" [level=3]
    - paragraph: Preparação em andamento. Confira os lotes e as quantidades separadas.
    - paragraph: O acompanhamento de rota, GPS e comprovantes ainda não está integrado neste portal.
    - group: Sobre o acompanhamento
  - group: Informações técnicas
  - paragraph: SIMULAÇÃO — dados sintéticos do Backend. Datas de criação e conclusão e estado financeiro não são fornecidos por este contrato.
```

# Test source

```ts
  101 |     await expect(page.getByRole('heading', {name:'Pedido RL-2026-001', exact:true})).toBeVisible();
  102 |     await page.getByRole('searchbox').fill(first.id);
  103 |     await expect(page.getByRole('heading', {name:'Pedido #F1E10A3778D7', exact:true})).toBeVisible();
  104 |     await page.getByRole('button', {name:`Ver detalhes do pedido ${first.id}`}).click();
  105 |     await expect(page.getByRole('region', {name:'Resumo do pedido'}).getByText('Pedido #F1E10A3778D7', {exact:true})).toBeVisible();
  106 |     await page.keyboard.press('Escape');
  107 |     await page.getByRole('navigation').getByRole('link', {name:'Dashboard', exact:true}).click();
  108 |     await expect(page.getByText('Pedido #F1E10A3778D7', {exact:true})).toBeVisible();
  109 |     await expect(page.getByText('Pedido RL-2026-001', {exact:true})).toBeVisible();
  110 |     expect(state.posts).toHaveLength(0);
  111 | });
  112 | for (const width of [1440,390]) test(`refinamento do pedido: áreas separadas e sem logística fictícia em ${width}px`,async({page},testInfo)=>{
  113 |     const order=makeOrder(id,'READY_TO_DISPATCH');order.allowed_actions=[];
  114 |     order.items[0].supplier_accepted_quantity=3;order.items[0].separated_quantity=3;
  115 |     order.fulfillments=[{id:'batch',supplier_order_id:id,state:'READY_TO_DISPATCH',version:4,lines:[{id:'batch-line',order_item_id:'line',allocated_quantity:3,separated_quantity:3}]}];
  116 |     const state=await setup(page,[order]);await page.setViewportSize({width,height:900});await page.goto('/fornecedor/pedidos');
  117 |     await expect(page.getByRole('heading',{name:'Quadro de pedidos'})).toBeVisible();
  118 |     await page.screenshot({path:testInfo.outputPath(`kanban-${width}.png`),fullPage:true});
  119 |     await page.getByRole('button',{name:`Ver detalhes do pedido ${id}`}).click();
  120 |     const dialog=page.getByRole('dialog');
  121 |     for(const label of ['Resumo do pedido','Produtos e quantidades','Lotes de atendimento','Situação logística','Ações do pedido'])await expect(dialog.getByRole('region',{name:label,exact:true})).toBeVisible();
  122 |     await expect(dialog.getByRole('region',{name:'Situação logística'})).toContainText('não confirma coleta ou entrega');
  123 |     await expect(dialog.getByRole('button',{name:/coletar|despachar|entregar|publicar rota/i})).toHaveCount(0);
  124 |     expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  125 |     expect(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
  126 |     await dialog.evaluate(element=>element.scrollTop=0);
  127 |     await page.screenshot({path:testInfo.outputPath(`supplier-details-${width}.png`),fullPage:true});
  128 |     const accessibility=await new AxeBuilder({page}).include('dialog').analyze();expect(accessibility.violations).toEqual([]);
  129 |     await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);expect(state.posts).toHaveLength(0);
  130 | });
  131 | 
  132 | test('filtro vazio tem recuperação explícita sem alterar pedidos',async({page})=>{
  133 |     const state=await setup(page,[makeOrder()]);await page.goto('/fornecedor/pedidos');
  134 |     await page.getByRole('searchbox').fill('inexistente');await expect(page.getByText('Nenhum pedido corresponde aos filtros nesta aba.')).toBeVisible();
  135 |     await page.getByRole('button',{name:'Limpar filtros',exact:true}).click();await expect(page.getByRole('button',{name:`Ver detalhes do pedido ${id}`})).toBeVisible();expect(state.posts).toHaveLength(0);
  136 | });
  137 | 
  138 | test("vazio sem mocks ou datas fictícias; navegação somente consulta", async ({page}) => {
  139 |     const state=await setup(page,[]); await page.goto("/fornecedor");
  140 |     await expect(page.getByRole("link",{name:"Pedidos recebidos: 0. Ver pedidos"})).toBeVisible();
  141 |     await expect(page.getByLabel("Ano do Dashboard")).toHaveCount(0);
  142 |     await expect(page.getByText("LOCAL-ONLY")).toHaveCount(0);
  143 |     await page.getByRole("navigation").getByRole("link",{name:"Pedidos",exact:true}).click();
  144 |     await expect(page.getByText("Nenhum pedido retornado pelo Backend para esta organização.")).toBeVisible();
  145 |     expect(state.posts).toHaveLength(0); expect(state.reads).toBe(1);
  146 | });
  147 | test("101 pedidos: paginação, contadores iguais e estado desconhecido acessível", async ({page}) => {
  148 |     const items=Array.from({length:100},(_,i)=>makeOrder(`order-${i}`)); items.push(makeOrder(id,"FUTURE_STATE"));
  149 |     const state=await setup(page,items); await page.goto("/fornecedor");
  150 |     await expect(page.getByRole("link",{name:"Pedidos recebidos: 101. Ver pedidos"})).toBeVisible();
  151 |     await expect(page.getByRole("link",{name:"Aguardando aceite: 100. Ver pedidos"})).toBeVisible();
  152 |     const menu=page.getByRole("navigation").getByRole("link",{name:"Pedidos 100 pedidos aguardando aceite"});
  153 |     await expect(menu).toBeVisible(); await menu.click();
  154 |     await expect(page.getByLabel("100 pedidos na etapa Novos")).toBeVisible();
  155 |     const unknown=page.getByRole("region",{name:"Outros estados",exact:true});
  156 |     await expect(unknown.getByText("Situação não reconhecida",{exact:true})).toBeVisible();
  157 |     await unknown.getByText('Estado informado pelo sistema',{exact:true}).click();
  158 |     await expect(unknown.getByText("FUTURE_STATE",{exact:true})).toBeVisible();
  159 |     await unknown.getByRole("button",{name:`Ver detalhes do pedido ${id}`}).click();
  160 |     await expect(page.getByRole("dialog").getByRole('region', {name:'Resumo do pedido'}).getByText('Situação não reconhecida', {exact:true})).toBeVisible();
  161 |     await page.getByRole('dialog').getByText('Informações técnicas',{exact:true}).click();
  162 |     await expect(page.getByRole('dialog').getByText(/Estado: FUTURE_STATE/)).toBeVisible();
  163 |     await expect(page.getByRole("dialog").getByRole("button",{name:"Aceitar pedido",exact:true})).toHaveCount(0);
  164 |     expect(state.posts).toHaveLength(0); expect(state.reads).toBe(2);
  165 | });
  166 | test("aceite repete chave após falha e atualiza menu, Kanban e dashboard", async ({page}) => {
  167 |     const state=await setup(page,[makeOrder()]); state.failPost=true;
  168 |     const dialog=await openDetails(page);
  169 |     await expect(dialog.getByRole("timer")).toContainText("d");
  170 |     await dialog.getByRole("button",{name:"Aceitar pedido",exact:true}).click();
  171 |     await dialog.getByRole("button",{name:"Confirmar aceite",exact:true}).click();
  172 |     await expect(dialog.getByRole("alert")).toBeVisible();
  173 |     await dialog.getByRole("button",{name:"Confirmar aceite",exact:true}).click();
  174 |     await expect(dialog.getByRole('region', {name:'Resumo do pedido'}).getByText('Aceito', {exact:true})).toBeVisible();
  175 |     expect(state.posts).toHaveLength(2); expect(state.posts[0].key).toBeTruthy(); expect(state.posts[0].key).toBe(state.posts[1].key);
  176 |     expect(state.posts[0].body.expected_version).toBe(3);
  177 |     await dialog.getByRole("button",{name:"Fechar",exact:true}).click();
  178 |     await expect(page.getByLabel("1 pedidos na etapa Aceitos")).toBeVisible();
  179 |     await expect(page.getByRole("navigation").getByLabel("1 pedido aguardando aceite")).toHaveCount(0);
  180 |     await page.getByRole("navigation").getByRole("link",{name:"Dashboard",exact:true}).click();
  181 |     await expect(page.getByRole("link",{name:"Aguardando aceite: 0. Ver pedidos"})).toBeVisible();
  182 |     await expect(page.getByRole("link",{name:"Em preparação: 1. Ver pedidos"})).toBeVisible();
  183 | });
  184 | test("separação explícita com versões distintas até pronto para coleta", async ({page}) => {
  185 |     const item=makeOrder(id,"ACCEPTED"); item.allowed_actions=["start-separation"]; item.items[0].supplier_accepted_quantity=3;
  186 |     const state=await setup(page,[item]); const dialog=await openDetails(page);
  187 |     await dialog.getByRole("button",{name:"Iniciar separação",exact:true}).click();
  188 |     await dialog.getByRole("region",{name:"Confirmação da operação"}).getByRole("button",{name:"Iniciar separação",exact:true}).click();
  189 |     await expect(dialog.getByRole("region", {name:"Resumo do pedido"}).getByText("Em separação", {exact:true})).toBeVisible();
  190 |     await dialog.getByRole("button",{name:"Criar lote",exact:true}).click();
  191 |     await dialog.getByRole("button",{name:"Criar lote de atendimento",exact:true}).click();
  192 |     await expect(dialog.getByRole('region', {name:'Lotes de atendimento'}).getByText('Em separação',{exact:true})).toBeVisible();
  193 |     await dialog.getByText('Informações técnicas',{exact:true}).click();
  194 |     await expect(dialog.getByText('Versão do lote: 1',{exact:true})).toBeVisible();
  195 |     await dialog.getByText('Informações técnicas',{exact:true}).click();
  196 |     await expect(dialog.getByText('3 alocados / 0 separados')).toBeVisible();
  197 |     await expect(dialog.getByRole("button",{name:"Marcar lote como pronto",exact:true})).toBeDisabled();
  198 |     await dialog.getByRole("button",{name:"Registrar separação do lote",exact:true}).click();
  199 |     await dialog.getByRole("spinbutton").fill("3");
  200 |     await dialog.getByRole("button",{name:"Registrar separação",exact:true}).click();
> 201 |     await expect(dialog.getByRole('region', {name:'Lotes de atendimento'}).getByText('Em separação · Versão do lote: 2')).toBeVisible();
      |                                                                                                                           ^ Error: expect(locator).toBeVisible() failed
  202 |     await dialog.getByRole("button",{name:"Marcar lote como pronto",exact:true}).click();
  203 |     await dialog.getByRole("region",{name:"Confirmação da operação"}).getByRole("button",{name:"Marcar lote como pronto",exact:true}).click();
  204 |     await expect(dialog.getByRole("region", {name:"Resumo do pedido"}).getByText("Pronto para coleta", {exact:true})).toBeVisible();
  205 |     expect(state.posts.map(post=>post.body.expected_version)).toEqual([3,4,1,2]);
  206 |     expect(state.posts.every(post=>post.key===undefined)).toBe(true);
  207 |     await dialog.getByRole("button",{name:"Fechar",exact:true}).click();
  208 |     await page.getByRole("navigation").getByRole("link",{name:"Dashboard",exact:true}).click();
  209 |     await expect(page.getByRole("link",{name:"Prontos para coleta: 1. Ver pedidos"})).toBeVisible();
  210 | });
  211 | test("autorização e falha temporária não recorrem aos dados locais", async ({page}) => {
  212 |     const state=await setup(page,[makeOrder()]); state.failList=403; await page.goto("/fornecedor");
  213 |     await expect(page.getByRole("alert")).toContainText("Sem autorização");
  214 |     await expect(page.getByRole("link",{name:/Pedidos recebidos:/})).toHaveCount(0);
  215 |     state.failList=503; await page.getByRole("button",{name:"Tentar novamente"}).click();
  216 |     await expect(page.getByRole("alert")).toContainText("Não foi possível");
  217 |     state.failList=0; await page.getByRole("button",{name:"Tentar novamente"}).click();
  218 |     await expect(page.getByRole("link",{name:"Pedidos recebidos: 1. Ver pedidos"})).toBeVisible();
  219 |     await expect(page.getByText("LOCAL-ONLY")).toHaveCount(0);
  220 | });
  221 | test("conflito de versão não avança o pedido e permite revisão", async ({page}) => {
  222 |     const state=await setup(page,[makeOrder()]); state.conflict=true; const dialog=await openDetails(page);
  223 |     await dialog.getByRole("button",{name:"Aceitar pedido",exact:true}).click();
  224 |     await dialog.getByRole("button",{name:"Confirmar aceite",exact:true}).click();
  225 |     await expect(dialog.getByRole("alert")).toContainText("Conflito de versão");
  226 |     await expect(dialog.getByRole("region", {name:"Resumo do pedido"}).getByText("Aguardando aceite", {exact:true})).toBeVisible();
  227 |     expect(state.posts).toHaveLength(1);
  228 |     await dialog.getByRole("button",{name:"Atualizar pedido e revisar"}).click();
  229 |     await expect(dialog.getByRole("region",{name:"Confirmação da operação"})).toHaveCount(0);
  230 | });
  231 | test("portal API e detalhes permanecem utilizáveis no celular", async ({page}) => {
  232 |     await page.setViewportSize({width:390,height:844});
  233 |     await setup(page,[makeOrder()]);
  234 |     const dialog=await openDetails(page);
  235 |     await expect(dialog).toBeVisible();
  236 |     await expect(dialog.getByText("R$ 0,30",{exact:true})).toBeVisible();
  237 |     expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  238 |     await dialog.getByRole("button",{name:"Fechar",exact:true}).click();
  239 |     await page.getByRole("button",{name:"Abrir menu"}).click();
  240 |     await expect(page.getByRole("dialog",{name:"Menu do fornecedor"}).getByLabel("1 pedido aguardando aceite")).toBeVisible();
  241 | });
  242 | 
  243 | for (const width of [1440, 1280, 1024, 768, 390, 360]) {
  244 |     test(`Kanban logístico e informações técnicas em ${width}px`, async ({page}) => {
  245 |         await page.setViewportSize({width, height:900});
  246 |         await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  247 |         const transit = makeOrder(id, 'AWAITING_BUYER_RECEIPT');
  248 |         transit.allowed_actions = [];
  249 |         const delivered = makeOrder('33333333-3333-4333-8333-333333333333', 'DELIVERED');
  250 |         delivered.allowed_actions = [];
  251 |         const state = await setup(page, [transit, delivered, makeOrder('refused', 'REFUSED')]);
  252 |         await page.goto('/fornecedor/pedidos');
  253 |         const board = page.getByRole('region', {name:'Rolagem do quadro de pedidos'});
  254 |         await expect(board.getByRole('heading', {name:'Entregues', exact:true})).toBeAttached();
  255 |         await expect(board.getByText('Entrega informada — aguardando confirmação do comprador')).toBeAttached();
  256 |         expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  257 |         expect(await board.evaluate(el => getComputedStyle(el).overflowY)).toBe('auto');
  258 |         if (width === 360 || width === 1440) {
  259 |             await board.evaluate(el => { el.scrollLeft = el.scrollWidth; });
  260 |             await page.screenshot({path:`test-results/kanban-${width}.png`, fullPage:true});
  261 |         }
  262 |         await board.getByRole('button', {name:`Ver detalhes do pedido ${id}`}).click();
  263 |         const dialog = page.getByRole('dialog');
  264 |         await expect(dialog.getByRole('region', {name:'Resumo do pedido'})).toBeVisible();
  265 |         await expect(dialog.getByRole('region', {name:'Resumo do pedido'}).getByText('Pedido #22222222', {exact:true})).toBeVisible();
  266 |         await expect(dialog.getByRole('button', {name:'Aceitar pedido', exact:true})).toHaveCount(0);
  267 |         await dialog.getByText('Informações técnicas', {exact:true}).click();
  268 |         await dialog.getByRole('button', {name:'Copiar UUID do pedido', exact:true}).click();
  269 |         await expect(dialog.getByText('Identificador copiado.', {exact:true})).toBeVisible();
  270 |         expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(id);
  271 |         await page.keyboard.press('Escape');
  272 |         await page.getByRole('tab', {name:/Histórico/}).click();
  273 |         await expect(page.getByRole('tabpanel', {name:/Histórico/}).getByText('Pedido #REFUSED')).toBeVisible();
  274 |         expect(state.posts).toHaveLength(0);
  275 |     });
  276 | }
  277 | test("logout e nova organização limpam pedidos e contadores anteriores", async ({page}) => {
  278 |     const state=await setup(page,[makeOrder()]);
  279 |     await page.goto("/fornecedor");
  280 |     await expect(page.getByRole("link",{name:"Pedidos recebidos: 1. Ver pedidos"})).toBeVisible();
  281 |     await page.getByRole("button",{name:"Sair",exact:true}).click();
  282 |     await expect(page).toHaveURL(/\/login$/);
  283 |     const nextOrg="77777777-7777-4777-8777-777777777777";
  284 |     state.identity={...user,id:"another-user",organization_id:nextOrg,organizations:[{id:nextOrg,name:"Outra organização",role:"SUPPLIER_OPERATOR"}]};
  285 |     state.items=[];
  286 |     await page.getByLabel("E-mail",{exact:true}).fill("another@example.invalid");
  287 |     await page.getByLabel("Senha",{exact:true}).fill("test-input-only");
  288 |     await page.getByRole("button",{name:"Entrar",exact:true}).click();
  289 |     await expect(page.getByRole("link",{name:"Pedidos recebidos: 0. Ver pedidos"})).toBeVisible();
  290 |     await expect(page.getByText(id,{exact:true})).toHaveCount(0);
  291 |     await expect(page.getByRole("navigation").getByLabel("1 pedido aguardando aceite")).toHaveCount(0);
  292 |     expect(state.posts).toHaveLength(0);
  293 | });
  294 | test("prazo expirado bloqueia aceite sem inventar transição de estado", async ({page}) => {
  295 |     const item=makeOrder(); item.acceptance_deadline="2000-01-01T00:00:00Z";
  296 |     const state=await setup(page,[item]); const dialog=await openDetails(page);
  297 |     await expect(dialog.getByRole("timer")).toHaveText("Prazo encerrado");
  298 |     await expect(dialog.getByRole("button",{name:"Aceitar pedido",exact:true})).toHaveCount(0);
  299 |     await expect(dialog.getByRole("region", {name:"Resumo do pedido"}).getByText("Aguardando aceite", {exact:true})).toBeVisible();
  300 |     expect(state.posts).toHaveLength(0);
  301 | });
```