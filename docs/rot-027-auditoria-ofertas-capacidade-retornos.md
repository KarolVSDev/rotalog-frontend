# Auditoria técnica e funcional — ROT-027 | Jornada Web do Fornecedor

Data da inspeção: **20/10/2026**. Escopo: frontend deste checkout, documentação local e exportação fornecida do Trello. **Somente análise: nenhuma implementação autorizada ou realizada.**

## A. Resumo executivo

**A ROT-027 está parcialmente implementada. Não falta apenas conectar o Backend.** Há uma jornada local consistente para catálogo de produtos do fornecedor, consulta de estoque, reserva no aceite, fila operacional, recusa, separação, prontidão, detalhes e histórico. Porém, **ofertas comerciais, capacidade operacional por data/janela e recebimento/conferência de retornos não possuem implementação funcional no frontend**.

O catálogo público do comprador existe como experiência separada com dados estáticos; não publica as alterações do cadastro do fornecedor. Editar `SupplierProduct.price` não equivale a criar ou administrar uma oferta vinculada a um produto canônico. Da mesma forma, `available = stock - reserved` não modela capacidade de atendimento. A recusa comercial antes do aceite não implementa recusa na entrega ou retorno físico.

Os três critérios resumidos da ROT-027 têm evidências locais: filtros por organização, apresentação de prazo/fuso/contador quando o prazo existe e campos independentes para comercial/financeiro/custódia. Isso **não comprova toda a descrição do card**, nem autorização de servidor ou execução transacional integrada. A expiração após duas horas úteis, a reserva de capacidade, a liberação de reservas e os efeitos financeiros ainda dependem de domínio/API; também faltam as interfaces correspondentes.

Correções importantes ao contexto recebido:

- **Exclusão de produtos não foi encontrada**: existem cadastro, edição, detalhes, importação e remoção de imagem; não há comando ou botão para excluir produto. Não se deve contabilizar exclusão como concluída, nem acrescentá-la ao escopo sem requisito.
- **Não há ajuste posterior da quantidade de estoque**: o formulário aceita quantidade inicial; a edição preserva `stock`. A orientação para ajustar quantidades em Estoque aponta para uma ação ainda ausente naquela tela.
- **Histórico de pedidos finalizados não é histórico de retornos**: os modelos e ações de retorno não existem.
- Os mocks atuais não trazem prazo real de aceite. O contador é implementado, mas não executa expiração automática nem bloqueia o aceite vencido.

**Recomendação de entrega:** abrir ou revisar um PR do subconjunto implementado é possível, com escopo e limitações explícitos e evidências atualizadas. Não apresentar a ROT-027 inteira como concluída. Para o escopo completo, desenvolver as interfaces restantes após acordar contratos; não é necessário aguardar todo o Backend para começar esses trabalhos com mocks.

### Fontes, método e limites

1. Exportação: `C:\Users\USER\Downloads\4NmXZdXn - rotalog.json`; board [Rotalog](https://trello.com/b/4NmXZdXn/rotalog). O JSON contém **167 cards**, incluindo arquivados, e `checklists: []`. Os critérios e subtarefas analisados são listas Markdown nas descrições, não checklists estruturados concluídos. `dateLastActivity` informado: `2026-10-20T14:30:34.674Z`; isso não certifica a data de cada requisito.
2. Documentos lidos: [README](../README.md), [Dashboard](supplier-dashboard.md), [histórico de pedidos](order-history.md), [revisão de aceite](order-acceptance-review.md), [movimentações](stock-movements.md) e [revisão de UI](portal-ui-review.md).
3. Inspeção de `src/`, rotas, permissões, modelos, hooks, serviços, persistência e testes em `tests/`. Componentes efetivamente montados foram distinguidos de mocks e placeholders.
4. **Não há OpenAPI, Swagger, schema de integração ou documento técnico V5 completo disponível neste checkout.** O README aponta o Backend como contrato canônico, mas isso não disponibiliza o contrato. O card ROT-005 consta como aprovado/merged na exportação; portanto, ausência de contrato local **não prova inexistência de endpoints no Backend**. O repositório Backend e APIs em execução não foram auditados.
5. Não houve consulta ao estado atual do board online, alteração de cards, execução de testes/build, navegador, instalação, migração ou acesso ao localStorage do usuário nesta auditoria. Testes abaixo são **evidência de cobertura por leitura das asserções**, não uma nova certificação de execução. Resultados reportados em entregas anteriores não substituem execução nesta revisão.
6. O checkout já contém alterações anteriores não commitadas. A única alteração desta tarefa é este relatório.

### Registro dos requisitos de origem e dependências

Os identificadores `Rxx` abaixo referem-se a **número + título + URL**, nunca somente ao número ROT.

| Ref. | Card ativo na exportação | Descrição, critérios e subtarefas relevantes |
|---|---|---|
| R27 | [ROT-027 — Criar jornada web do fornecedor](https://trello.com/c/26AXGm7g) | Implementar oferta, estoque, capacidade, fila, aceite, recusa, separação, prontidão e retornos. Critérios: própria organização; prazo absoluto/fuso/restante; três estados separados. A: telas de marketplace, depende de ROT-019, ROT-020 e ROT-025. B: fila operacional. Lista: **Em testes**. |
| R19 | [ROT-019 — Implementar ofertas por fornecedor](https://trello.com/c/oINOUvbZ) | Oferta vinculada ao catálogo com preço, validade e condição por fornecedor. Somente autorizado altera sua oferta; preço em NUMERIC, nunca float no armazenamento de domínio; inválidas/vencidas não elegíveis. A: modelar Offer/serviços, depende de ROT-018. B: UI do fornecedor. Backlog. |
| R20 | [ROT-020 — Implementar estoque declarado e capacidade](https://trello.com/c/h0XvAAAP) | Saldo disponível/reservado e capacidade por **data/janela** com administração e regras transacionais. Saldo vendável desconta reservas; quantidade/capacidade não negativas; concorrência preserva invariantes. A: InventoryBalance/CapacitySlot, depende de R19. B: locks e telas de declaração. Backlog. |
| R25 | [ROT-025 — Implementar aceite, recusa e expiração do fornecedor](https://trello.com/c/wlFRbaIN) | Aceite/recusa integrais e expiração após **duas horas úteis**, conciliando reserva/pedido/reembolso. Aceite e expiração disputam mesmo lock, primeiro commit vence; recusa/expiração liberam reservas e encaminham reembolso; saída gera auditoria/notificação. A: accept/refuse, depende de ROT-024. B: job e teste de corrida. Backlog. |
| R28 | [ROT-028 — Implementar separação, prontidão e falha pré-despacho](https://trello.com/c/dtfFSlGZ) | Comandos de separar, pronto, falha pré-despacho e reagendar. Aceite não inicia separação; somente pronto entra em rota publicada; cancelamento/separação protegidos por lock/versão. A: transições/endpoints, depende de R25. B: telas/testes concorrentes. Backlog. |
| R40 | [ROT-040 — Implementar recusa e tentativa frustrada](https://trello.com/c/zB4l3hHv) | DELIVERY_REFUSED/ATTEMPT_FAILED, custódia com motorista, início do retorno; motivo/contato/evidência auditados; falha não transfere custódia ao comprador nem libera valor ao fornecedor. A: comandos fail/refuse, depende de ROT-033. B: telas Android/web. Backlog. |
| R41 | [ROT-041 — Implementar recebimento e conferência do retorno](https://trello.com/c/DMywFGxk) | Fornecedor recebe, confere volumes/condição e reconcilia. Mercadoria ausente não volta automaticamente ao estoque; custódia/estoque atualizados na mesma transação; silêncio por um dia útil aceita retorno **conforme regra da demo**. A: Return/endpoints, depende de R40. B: job/UI. Backlog. |
| R42 | [ROT-042 — Implementar divergência, extravio e dispensa de retorno](https://trello.com/c/lcY5MoOL) | Divergência, dano/perda, investigação e decisão manual auditada; divergência não altera estoque antes da reconciliação; extravio/dispensa exigem capacidade e motivo; coerência custódia/pagamento. A: comandos, depende de R41. B: telas/testes de invariantes. Backlog. |
| R43 | [ROT-043 — Implementar única reentrega integral](https://trello.com/c/4cTutcjY) | Após reconciliação/dispensa, **comprador** escolhe reentrega ou reembolso; no máximo uma reentrega integral; falha encaminha reembolso, sem terceira tentativa; escolha não expira na demo. A: contador/transições, depende de R41/R42. B: UI/testes. Backlog. |

Dependências auxiliares ativas examinadas:

- [ROT-018 — Implementar catálogo canônico](https://trello.com/c/3IoYhAp5): produtos canônicos de alimentos secos/industrializados, unidade fixa, edição administrativa versionada/auditada, snapshots imutáveis. Depende de ROT-004/ROT-016. Os produtos de construção dos mocks atuais não comprovam aderência a essa categoria de domínio.
- [ROT-021 — Implementar pesquisa, filtros e comparação de ofertas](https://trello.com/c/CsnwwmqT): somente elegíveis/autorizadas; comparação de fornecedor/preço/unidade/validade/disponibilidade; paginação. Cita explicitamente **GET /products e /offers**. Depende de R19/R20.
- [ROT-024 — Criar pedido e máquina de estados comercial](https://trello.com/c/QJEWTyBB): pedido após pagamento e reserva revalidada; versão, transições, `allowed_actions`, 409 sem efeito parcial; eixos separados. Depende de ROT-023.
- [ROT-033 — Implementar início de tentativa de entrega](https://trello.com/c/SE8BPJWE): tentativa por operação, contatos, motorista/dispositivo/horário, rota/parada autorizadas. Base de R40; não é ação de fornecedor por inferência.
- [ROT-044 — Implementar cancelamento normal e excepcional](https://trello.com/c/n2slmNv8): concorrência com separação, CANCELLED distinto de REFUNDED, intervenção com ator/motivo/antes-depois; depende de ROT-024/ROT-016.
- [ROT-048 — Implementar reembolso, repasse e pagamento tardio simulados](https://trello.com/c/GaTGveve): idempotência financeira; COMPLETED não implica liberação de valor. Não há esse serviço integrado no checkout.
- [ROT-016 — Implementar auditoria append-only e timeline](https://trello.com/c/QiPUf3oO): transição e auditoria na mesma transação; ator, organização, versão, origem, motivo, request ID; timeline autorizada com cursor.
- [ROT-005 — Implementar contrato OpenAPI, erros e request ID](https://trello.com/c/EYQzH3La): `/api/v1`, JSON snake_case, `code/message/details/request_id`, X-Request-Id, paginação e OpenAPI. Na lista **✅ Aprovado/Merged na Main** do exportado, mas sem contrato disponível neste frontend.

### Cards repetidos e contexto arquivado — não substituir os ativos

Todos os cards desta tabela têm `closed: true` na exportação. **Arquivado não significa implementado, aprovado ou substituto vigente.** Seus detalhes ajudam a identificar ambiguidades; impor suas regras adicionais à R27 ativa depende de ratificação do responsável pelo produto.

| Ref. contextual | Número, título completo e URL | Critérios/dependências relevantes e distinção |
|---|---|---|
| A26 | [ROT-026 — [Dashboard Web][Funcionalidade] Implementar gestão de catálogo e ofertas](https://trello.com/c/YQ0C0FcT) | Criar/revisar/aprovar/bloquear/revalidar por papel; filtros na URL, paginação, erro/permissão; condições aceitas imutáveis; ações da API/auditoria. Depende de ROT-023 `IfrjYiv0` e ROT-025 `Xpauenyd`; bloqueia A29. Não implica que fornecedor aprove sua própria oferta. |
| A27 | [ROT-027 — [Dashboard Web][História] Exibir catálogo e comparação de ofertas no portal do comprador](https://trello.com/c/59JO6sPe) | Comparar fornecedor, unidade, quantidade, preço, frete, total, janela e validade; URL/paginação/API; não prometer economia automática; vencidas não elegíveis. Depende de ROT-010 `FK70a3wT`, ROT-023 `IfrjYiv0`, A25. **Não é R27 da jornada do fornecedor.** |
| A29 | [ROT-029 — [Dashboard Web][Funcionalidade] Implementar gestão de estoque declarado e capacidade](https://trello.com/c/yeXYFE2y) | Total/reservado/disponível, atualização e conflitos de versão; formulários/erros de concorrência. Não prometer físico em tempo real; ações por capacidade de autorização. Depende de A26/A28; bloqueia ROT-058 `t45IvvHQ`. |
| A36 | [ROT-036 — [Dashboard Web][Funcionalidade] Implementar caixa de pedidos e decisão do fornecedor](https://trello.com/c/VUlQ4UXq) | Confirmação/motivo, 409/expiração/idempotência; preço/quantidade/endereço/data-janela/capacidade visíveis; sem mudança silenciosa. Depende de ROT-023 `IfrjYiv0`, ROT-035 `bkgu355m`, ROT-073 `QJUS6I0s`; bloqueia ROT-039 `sRdDEgW1`/ROT-058 `t45IvvHQ`. |
| A50 | [ROT-050 — [Dashboard Web][Funcionalidade] Implementar operação de incidentes, retornos e disputas no portal interno](https://trello.com/c/kEParr8p) | Filas e comandos excepcionais por capacidade/motivo, antes/depois; sem editor genérico; segregação/mascaramento. Depende de ROT-041 `3YkEfOJF`, ROT-048 `1RhXAvts`, A49 e ROT-052 `M9jq0VHV`. **Portal interno RotaLog, não permissão irrestrita do fornecedor.** |
| A25 | [ROT-025 — [Backend][Funcionalidade] Implementar catálogo curado e ofertas](https://trello.com/c/Xpauenyd) | Admin mantém canônico, fornecedor propõe; expirada oculta até revalidar; validade inicial limitada a 24h e itens secos/lacrados/padronizados/indivisíveis. Depende de ROT-021 `euh4i3Xc`/ROT-022 `GcSKOxg1`; bloqueia A26/A27/A28. **Não é R25 de aceite/expiração.** O limite de 24h é contexto arquivado, não regra assumida para R19. |
| A28 | [ROT-028 — [Backend][Funcionalidade] Implementar estoque declarado e capacidade manual](https://trello.com/c/6fWLFvv0) | Saldo, preço/validade, capacidade data/janela, versão/horário; PostgreSQL autoritativo; ERP/físico em tempo real fora do escopo. Depende de ROT-013 `LJ8SB779`/A25; bloqueia A29/ROT-030 `gMUkrsBW`. **Não é R28 de separação.** |
| A30 | [ROT-030 — [Backend][Task técnica] Implementar bloqueio atômico de saldo e capacidade](https://trello.com/c/gMUkrsBW) | Checkout reserva itens e capacidade integralmente, tudo ou nada; concorrência sem saldo/capacidade negativos; SELECT FOR UPDATE/constraints; expiração/limpeza idempotente. Depende de A28; bloqueia ROT-031 `mZzjyUdI`. Regra contextual que precisa ser alinhada ao aceite local. |
| A49 | [ROT-049 — [Backend][Funcionalidade] Implementar falha, retorno e reconciliação](https://trello.com/c/iLTkAvWR) | Custódia com motorista até transferência; fornecedor tem um dia útil para divergir; ausente em investigação; comprador escolhe solução. Depende de ROT-042 `6hUUIlQ9`, ROT-044 `sWFkzCGA`, ROT-072 `2EVLnDVI`; bloqueia A50 e outros fluxos de exceção. Complementa o contexto de R41/R42, sem comprovar implementação. |
| A53 | [ROT-053 — [Dashboard Web][História] Implementar contestação e escolha de solução no portal do comprador](https://trello.com/c/p1uiJLQG) | Escolha autorizada integral, prova privada, prazo/valor bloqueado; sem terceira reentrega. Depende de ROT-023 `IfrjYiv0`, ROT-046 `OXaKLFzx`, ROT-052 `M9jq0VHV`. A escolha é do comprador, não do fornecedor. |

Outras colisões identificadas, todas arquivadas e distintas de R19/R20/R40–R43:

- [ROT-019 — [Backend][Funcionalidade] Modelar empresas, usuários, papéis e autorizações](https://trello.com/c/tDVrZo3P).
- [ROT-020 — [Backend][Funcionalidade] Implementar autenticação JWT e renovação de sessão](https://trello.com/c/XAER1wLu).
- [ROT-040 — [Backend][Funcionalidade] Implementar rotas e paradas manuais](https://trello.com/c/3L49ydTE).
- [ROT-041 — [Dashboard Web][Funcionalidade] Implementar montagem de rota e visão de custódia](https://trello.com/c/3YkEfOJF).
- [ROT-042 — [Backend][Funcionalidade] Implementar despacho e transferências de custódia](https://trello.com/c/6hUUIlQ9).
- [ROT-043 — [Mobile][Funcionalidade] Implementar rota, paradas e custódia no aplicativo Android](https://trello.com/c/e7ERzQAa).

As referências por shortLink preservam a identidade quando os textos mencionam apenas números repetidos.

## B. Matriz de rastreabilidade

Classificações: **IMPLEMENTADO** significa comportamento local conectado à UI, não integração real. **PARCIAL** indica lacuna no requisito completo. **SOMENTE FRONTEND** identifica trabalho que pode começar com mocks, não algo já existente. **DEPENDE DO BACKEND** não significa que o Backend esteja necessariamente sem implementação: o contrato/endpoint não foi comprovado aqui. **REQUISITO INDEFINIDO** exige decisão; **FORA DO ESCOPO** é relativo ao portal do fornecedor desta entrega.

As evidências E01–E12 estão detalhadas após a tabela, com arquivo, símbolo, teste e limite.

| Requisito | Card de origem | Evidência no código | Status | Dependência | Próxima ação |
|---|---|---|---|---|---|
| Própria organização em telas, comandos locais e imagens | R27/R19/R20 | E01/E02/E10 | IMPLEMENTADO local / DEPENDE DO BACKEND integrado | Identidade, vínculo e autorização server-side | Consumir organização/permissões autenticadas; testar acesso indevido na API |
| Cadastro/edição/preço/importação de produto | R27; base para R19 | E02 | IMPLEMENTADO local | Catálogo canônico/versionamento para integração | Preservar UI e separar os contratos Product/Offer |
| Excluir produto | Contexto do pedido; sem requisito explícito correspondente | E02: não há ação de exclusão | REQUISITO INDEFINIDO | Política de referências e histórico | Não declarar pronto nem criar sem decisão |
| Offer por fornecedor/produto, validade/condição/preço | R19 | E02/E03: só produtos | SOMENTE FRONTEND ausente / DEPENDE DO BACKEND integrado | Produto canônico, contrato de Offer | Formulário/lista de ofertas com adaptador mock |
| Publicar/despublicar, ativar/pausar/encerrar | R19; A26 contextual | E02/E03: nenhum lifecycle | REQUISITO INDEFINIDO | Estados/ações e autoridade de publicação | Confirmar lifecycle; não inventar cinco comandos |
| Aprovar/bloquear ofertas canônicas por Admin | A26/A25 | E03/E12: não há administração funcional | FORA DO ESCOPO de ação do fornecedor | Curadoria e papel Admin | Tratar em jornada própria, se ratificada |
| Ocultar/impedir compra de oferta inválida/vencida | R19/ROT-021 | E03: boolean estático `available` | PARCIAL como catálogo; SOMENTE FRONTEND para UX / DEPENDE DO BACKEND para elegibilidade | Oferta válida e revalidação no servidor | Fonte única de ofertas elegíveis; testes de vencimento |
| Preço de domínio NUMERIC | R19 | E02: `price: number`, `Number(...)`; nenhum banco aqui | DEPENDE DO BACKEND | Tipo decimal e serialização monetária | Acordar representação no transporte; não prometer NUMERIC por usar input decimal |
| Estoque físico declarado, reservado e disponível | R20/R27 | E04/E05 | IMPLEMENTADO local / PARCIAL para R20 completo | InventoryBalance e reservas canônicas | Distinguir declaração de medição real; integrar saldo oficial |
| Atualização manual de saldo após cadastro | R20; A29 contextual | E02/E04: quantidade só inicial | SOMENTE FRONTEND ausente / DEPENDE DO BACKEND integrado | Comando de declaração, concorrência/versão | Criar formulário de declaração; não editar quantidade silenciosamente |
| Data/horário de declaração e conflito de versão | A28/A29; concorrência de R20 | E02/E05: sem versão geral | SOMENTE FRONTEND para feedback / DEPENDE DO BACKEND | Versão/409 e timestamp da origem | Exibir dados e conflito recuperável conforme contrato |
| CapacitySlot por data/janela, edição e consumo | R20 | E02/E04/E06: nenhum slot | SOMENTE FRONTEND ausente / REQUISITO INDEFINIDO nas unidades / DEPENDE DO BACKEND integrado | Unidade/limite/consumo e reserva transacional | Definir modelo; UI de declaração e consulta |
| Fila, detalhes, aceite/recusa, separar/pronto | R27/R25/R28 | E05/E06/E07 | IMPLEMENTADO local / PARCIAL integrado | API de pedidos, `allowed_actions`, versão | Adaptador HTTP e estados de resposta do servidor |
| Prazo absoluto/fuso/restante e ausência correta | R27 | E07 | IMPLEMENTADO na apresentação | Deadline real e relógio autoritativo | Integrar prazo calculado pelo Backend |
| Expiração 2h úteis, corrida com aceite, liberação/reembolso | R25 | E05/E07: contador não expira domínio | DEPENDE DO BACKEND; UX de expiração SOMENTE FRONTEND ausente | Job, calendário, lock e financeiro | Mostrar expiração canônica; testar 409/corrida integrada |
| Estados comercial/financeiro/custódia separados | R27/ROT-024 | E06/E07 | IMPLEMENTADO local / PARCIAL quanto ao domínio completo | Enumerações e transições canônicas | Mapear estados adicionais sem comprimir em `status` |
| Falha pré-despacho/reagendamento/cancelamento concorrente | R28/ROT-044 | E05/E06: apenas dois comandos operacionais | SOMENTE FRONTEND ausente / DEPENDE DO BACKEND integrado | Ações por estágio, lock/versão e motivo | Adicionar ações nominais após contrato, sem cancelar unilateralmente |
| Recusa na entrega/tentativa frustrada e retorno em trânsito | R40 | E06/E09/E12: nenhum modelo | SOMENTE FRONTEND para consulta / DEPENDE DO BACKEND e Mobile para eventos | DeliveryAttempt, evidências e custódia | Fornecedor acompanha; motorista registra o resultado autorizado |
| Receber/conferir retorno, volumes e condição | R41 | E06/E08: inexistente | SOMENTE FRONTEND ausente / DEPENDE DO BACKEND integrado | Return e reconciliação transacional | Lista/detalhe/comando de conferência com mock |
| Divergência de retorno e investigação | R41/R42; A49 contextual | E06/E08: inexistente | SOMENTE FRONTEND para UI / DEPENDE DO BACKEND; permissões parcialmente INDEFINIDAS | Campos de divergência e decisão autorizada | Separar declaração do fornecedor da decisão operacional |
| Extravio/dispensa com motivo e efeitos coerentes | R42 | E08/E12: inexistente | DEPENDE DO BACKEND; decisão FORA DO ESCOPO sem autorização do fornecedor | Capacidade operacional específica e auditoria | Exibir resultado permitido; não expor decisão genérica |
| Silêncio por um dia útil na demo | R41 | E08: sem prazo/job de retorno | DEPENDE DO BACKEND | Marco inicial, calendário e reconciliação | UI de prazo quando fornecido; job fora do navegador |
| Uma reentrega integral ou reembolso | R43 | E09: compras mock sem comandos | FORA DO ESCOPO da decisão do fornecedor / DEPENDE DO BACKEND | Escolha do comprador e contador global | Exibir acompanhamento no fornecedor; escolha em jornada do comprador |
| Histórico de movimentações reais locais | R20, suporte a R41 futuro | E08 | IMPLEMENTADO para inicial/reserva; PARCIAL para domínio futuro | Novos eventos reais de baixa/liberação/retorno | Não criar eventos de retorno apenas para preencher tabela |
| Histórico de finalizados por evento real | R27, suporte de consulta | E07 | IMPLEMENTADO local quando há data | `completedAt`/`rejectedAt` reais | Manter grupo sem data; não confundir com reconciliação de retorno |

### Evidências técnicas verificáveis

**E01 — Rotas, organização e autenticação local.** [router.tsx](../src/app/router.tsx), `ProtectedRoute`, monta Dashboard/Pedidos/Produtos/Estoque sob `/fornecedor`; `/fornecedor/rotas` é `FeaturePlaceholder`. [AppLayout](../src/shared/components/AppLayout.tsx), `activeOrganization`/`allowedOrganizations`, usa `usersMock`, não um vínculo retornado pela API. [routePermissions](../src/app/routePermissions.ts) contém permissões provisórias de visualização. [AuthProvider](../src/features/auth/context/AuthProvider.tsx) usa `rotalog:mock-auth-user` em sessionStorage. As telas e serviços filtram por organização; isso não é fronteira de segurança do servidor. Testes: isolamento em [supplier-products.test.cjs](../tests/supplier-products.test.cjs), [supplier-stock.test.cjs](../tests/supplier-stock.test.cjs), troca de organização em [annual-history.spec.ts](../tests/e2e/annual-history.spec.ts). Lacuna: identidade/associação e capacidade de comando reais.

**E02 — Produto local, não Offer.** [products.mock.ts](../src/features/products/mocks/products.mock.ts), `SupplierProduct` (linha 9), possui ID/organização/nome/categoria/unidade/preço/stock/imagem/movimentos/disponibilidade. Não possui produto canônico separado, Offer, validade, condição ou lifecycle. [supplierProducts.service.ts](../src/features/products/services/supplierProducts.service.ts), `createSupplierProducts`/`editSupplierProduct`, cria e edita preço/metadados; edição não altera estoque/organização/ID. Chave: `rotalog:supplier-products:v1:<organização>`. [ProductFormModal](../src/features/products/components/ProductFormModal.tsx), quantidade somente no cadastro (linha 72), mantém orientação de ajuste ainda não implementado no Estoque (linha 74). [SupplierProducts](../src/features/products/pages/SupplierProducts.tsx), ações de detalhes/editar (linhas 231–232), sem excluir/publicar. Remover em `productImages.service` refere-se a imagem, não produto. Testes de validação, isolamento, XLSX e preservação de estoque: [supplier-products.test.cjs](../tests/supplier-products.test.cjs). Lacuna: domínio e UI de ofertas, declaração posterior e eventual política de exclusão.

**E03 — Marketplace utilizado, mas estático e desconectado.** [catalog/products.mock.ts](../src/features/catalog/mocks/products.mock.ts), `CatalogProduct`/`catalogProducts`, usa IDs `produto-*`, fornecedor como `supplierId` e `available: boolean`. [ProductCatalog](../src/features/catalog/pages/ProductCatalog.tsx), `filteredProducts`, pesquisa nome/fornecedor e categoria; não consulta `getSupplierProducts`, não compara ofertas do mesmo produto nem filtra validade. [ProductDetails](../src/features/catalog/pages/ProductDetails.tsx) consulta o mesmo array e limita adicionar ao carrinho pelo boolean. É experiência navegável, não publicação de oferta. [CartProvider](../src/features/cart/context/CartProvider.tsx) tem fonte local própria `rotalog:cart:<usuário>`. Não há teste existente que demonstre produto salvo pelo fornecedor aparecendo como oferta elegível no comprador. Lacuna: identidade canônica, oferta compartilhada, elegibilidade e integração das jornadas.

**E04 — Estoque e disponibilidade.** [stockReservation.ts](../src/features/inventory/services/stockReservation.ts), `getStockBalance`/`planStockReservation`, soma reservas vinculadas a produtos da organização, valida quantidade positiva/suficiência, mantém físico e calcula disponível. [useSupplierInventory](../src/features/inventory/hooks/useSupplierInventory.ts) combina os hooks de Produtos/Pedidos e calcula disponibilidade: zero indisponível, até 10 baixo, demais disponível. [SupplierInventory](../src/features/inventory/pages/SupplierInventory.tsx) monta quatro indicadores, tabela e `StockMovementHistory`; não possui comando de ajuste ou CapacitySlot. Testes: [supplier-stock.test.cjs](../tests/supplier-stock.test.cjs), [supplier-stock.spec.ts](../tests/e2e/supplier-stock.spec.ts) e [dashboard.spec.ts](../tests/e2e/dashboard.spec.ts). Lacuna: atualização de declaração, horário, capacidade e versão; o rótulo físico representa saldo declarado local, não medição em tempo real.

**E05 — Comandos e consistência local.** [supplierOrders.service.ts](../src/features/orders/services/supplierOrders.service.ts), `changeSupplierOrderStatus` (linha 105), `changeSupplierOrderOperationalStatus` (175) e `localSupplierOrderAcceptanceService.accept` (245), valida organização/etapa, reserva integralmente no aceite, registra recusa com motivo/justificativa e permite apenas `start-separation`/`mark-ready`. Aceite não inicia separação. [orderWriteLock.ts](../src/features/orders/services/orderWriteLock.ts), `withOrderWriteLock`, serializa aceite entre abas via IndexedDB, com fallback Web Locks; pedido/reserva/eventos são salvos numa única chave `rotalog:supplier-orders:v1`. Não é transação de PostgreSQL nem transação entre catálogo e pedidos. Recusa e preparação não usam esse mutex comum de aceite/expiração; não há job de expiração, versão de pedido ou teste de corrida com cancelamento/job. Testes de dupla reserva, insuficiência, escrita falha e simultaneidade: [supplier-stock.test.cjs](../tests/supplier-stock.test.cjs), [supplier-stock.spec.ts](../tests/e2e/supplier-stock.spec.ts). Lacuna: comandos canônicos, liberação/baixa, concorrência geral, idempotência de API, calendário e auditoria append-only.

**E06 — Modelo de pedido limitado.** [orders.mock.ts](../src/features/orders/mocks/orders.mock.ts), `SupplierOrder`, separa comercial, financeiro e custódia; guarda itens com nome/quantidade/preço, prazo/fuso opcionais, recusa, reserva e `completedAt` opcional. Não há Offer ID, snapshot de unidade, CapacitySlot, data/janela de atendimento, endereço, Return, DeliveryAttempt, divergência, investigação, reentrega, allowed_actions ou versão. [orderStage.ts](../src/features/orders/utils/orderStage.ts) projeta as etapas atuais; [SupplierOrders](../src/features/orders/pages/SupplierOrders.tsx) monta cinco colunas ativas e histórico, não retornos. Tipos não suportam os estados de retorno e expiração documentados. Testes de independência dos estados: [supplier-stock.test.cjs](../tests/supplier-stock.test.cjs), [order-acceptance-review.spec.ts](../tests/e2e/order-acceptance-review.spec.ts). Lacuna: ampliar contratos sem fazer custódia ou dinheiro sinônimos de finalização.

**E07 — UI efetiva de consulta e prazos.** [OrderDetailsModal](../src/features/orders/components/OrderDetailsModal.tsx) mostra os três campos independentes, sem inferir custódia do legado; itens vêm de `order.orderItems`. Nome/quantidade/preço são snapshots; **unidade e imagem são consultadas no catálogo atual**, logo unidade ainda não é condição congelada. [OrderDeadline](../src/features/orders/components/OrderDeadline.tsx) está montado no modal/cards novos e atualiza contador; [orderDeadline.ts](../src/features/orders/utils/orderDeadline.ts), `getOrderDeadline`, exige instante com offset, mostra ausência/invalidade e fallback de exibição de fuso. Ao zerar não altera pedido; o teste inclusive mantém Aceitar habilitado. [OrderHistory](../src/features/orders/components/OrderHistory.tsx)/[orderHistory.ts](../src/features/orders/utils/orderHistory.ts), `getOrderHistoryDay`, usam conclusão/recusa real; desconhecidos ficam em grupo próprio, com filtros e paginação. [SupplierDashboard](../src/features/dashboard/pages/SupplierDashboard.tsx) usa hooks reais locais, filtro anual e agregações, não o arquivo de mock do Dashboard como prova. Testes: [dashboard.test.cjs](../tests/dashboard.test.cjs), [annual-history.spec.ts](../tests/e2e/annual-history.spec.ts), [order-acceptance-review.spec.ts](../tests/e2e/order-acceptance-review.spec.ts). Lacuna: deadline/calendário oficiais e snapshot completo; `completedAt` não tem produtor de entrega no fluxo atual.

**E08 — Movimentações não são reconciliação de retorno.** [stockMovement.ts](../src/features/inventory/models/stockMovement.ts) limita tipos a `reservation`/`initial-stock`; [stockMovements.ts](../src/features/inventory/services/stockMovements.ts), `createInitialStockMovement`/`createReservationMovements`/`collectStockMovements`, registra apenas cadastro/importação positiva e reserva. [supplierStockMovements.service.ts](../src/features/inventory/services/supplierStockMovements.service.ts) projeta eventos dos agregados existentes; não cria dados ao consultar. Testes: [stock-movements.spec.ts](../tests/e2e/stock-movements.spec.ts) e testes de estoque/produtos. Não há liberação, baixa, ajuste físico posterior ou entrada de retorno. `getStockBalance` considera toda reserva existente, inclusive em pedido posteriormente entregue; não há ciclo final de liquidação de saldo. Lacuna: primeiro implementar evento real e reconciliação de domínio; não somar retorno ao estoque em tela ou inferir eventos passados.

**E09 — Compras não implementam reentrega/reembolso.** [purchases.mock.ts](../src/features/purchases/mocks/purchases.mock.ts), `Purchase` e outro `SupplierOrder`, usa CONFIRMED/PENDING/FAILED/CANCELLED/PARTIAL e frete/previsão próprios. [BuyerPurchaseDetails](../src/features/purchases/pages/BuyerPurchaseDetails.tsx) exibe esses mocks, sem comandos de escolha, Return ou serviço financeiro. Labels CANCELLED/FAILED/PARTIAL e texto sobre reembolso **não comprovam os fluxos R40–R43**. Lacuna: integração de modelos/jornadas; decisão do comprador fora das ações do fornecedor.

**E10 — Imagens funcionais locais.** [productImages.service.ts](../src/features/products/services/productImages.service.ts), `productImageStorage`, usa IndexedDB `rotalog:supplier-product-images` com chave `[organizationId, reference]`; [saveProductWithImage](../src/features/products/services/saveProductWithImage.ts) coordena referência, preservação, substituição, remoção e compensação de falha. [ProductImage](../src/features/products/components/ProductImage.tsx) é usado nas tabelas/modal. Testes: [product-images.test.cjs](../tests/product-images.test.cjs), [product-images.spec.ts](../tests/e2e/product-images.spec.ts). Isso **não é armazenamento privado de evidências de entrega/retorno**, nem autorização de API.

**E11 — Cobertura existente e ausente.** Há testes locais de estoque/produtos/imagens/Dashboard e e2e de estoque, movimentações, Dashboard, histórico, revisão de aceite e UI. [portal-ui.spec.ts](../tests/e2e/portal-ui.spec.ts) contém matriz de 1440/1280/1024/768/390/360 e axe; isso cobre as telas presentes. Não há serviço, componente ou suíte funcional de Offer, CapacitySlot ou Return. Mocks de pedidos usados para testar histórico não criam uma jornada de retorno. Ausência verificada pela árvore de fontes, rotas, modelos e busca de símbolos, não apenas pelo nome de um arquivo.

**E12 — Integração ainda local.** Serviços em `features/services/auth.service.ts`, Produtos/Pedidos/Estoque e hooks não fazem chamadas HTTP de domínio. Não foram encontrados cliente OpenAPI, wrapper API ou adaptadores de ofertas/capacidade/retornos. O único `/fornecedor/rotas` é placeholder. Isso limita a comprovação ao checkout; não permite concluir que os endpoints estejam ausentes do repositório Backend.

### Consistência, duplicações e lógica crítica

| Achado | Evidência e impacto | Classificação / encaminhamento |
|---|---|---|
| Duas representações de produto e duas de pedido | E02/E03/E06/E09: IDs, fornecedores, estados e fontes distintos. Alteração no fornecedor não muda marketplace/compras. | PARCIAL; contratos canônicos/adaptadores antes de conectar jornadas. Não unificar por migração automática. |
| Oferta confundida com preço no produto | E02: `price` é editável, mas falta identidade/validade/condição de Offer. | SOMENTE FRONTEND + BACKEND; separar conceitos sem perder produtos locais. |
| Disponibilidade armazenada e também derivada | Produtos usa `SupplierProduct.availability` calculada no cadastro; Estoque/Dashboard usa hook após reservas. “Disponível” pode ter bases diferentes. Regra zero/até 10 aparece no cadastro e no hook. | PARCIAL; definir semântica por tela e fonte comum. Nenhum teste de equivalência de disponibilidade entre Produtos e Estoque foi encontrado. |
| Unidade de pedido lida do catálogo vivo | E07, `catalogById.get(...).unit`, enquanto edição permite mudar unidade. Contraria a finalidade de snapshot imutável da ROT-018. | PARCIAL; snapshot canônico deve conter unidade e condições essenciais. Não alterar pedidos antigos automaticamente. |
| Categoria/métrica de quantidade não uniformes | Mock permite m³ e quantidade fracionária, importação aceita frações; catálogo canônico ativo trata alimentos com unidade fixa. `items: number` e `orderItems[]` têm significados locais distintos. | REQUISITO INDEFINIDO no mapeamento final; definir unidade e precisão por produto/capacidade. Não aplicar regra de carga integral como proibição de fracionário sem contrato. |
| Regras e persistência no navegador | E05: validação de organização/estoque, reserva, estados e lock são locais. `getSupplierOrders` tem fallback para mocks; `readSupplierOrders` falha explicitamente. Dashboard/Pedidos usam leitura estrita, mas AppLayout usa leitura com fallback para contador. | IMPLEMENTADO local; servidor deve validar todas as invariantes. Leituras de erro devem ter semântica alinhada na integração. |
| Garantia concorrente limitada | Aceite serializado; catálogo sem versionamento geral. `saveProductWithImage` verifica referência de imagem concorrente, não conflito de todos os metadados. localStorage e IndexedDB não compartilham transação. | DEPENDE DO BACKEND; documentado em `stock-movements.md`; não alegar ACID distribuído ou auditoria imutável. |
| Reserva ocorre em fase diferente do domínio descrito | E05 reserva no aceite; ROT-024 exige pedido após pagamento e reserva preservada, e A30 contextual reserva no checkout. | PARCIAL integrado; Backend deve definir ownership/ciclo da reserva. Conectar o aceite local sem adapter pode duplicar reserva de checkout. |
| Declaração de estoque incompleta | E02/E04: quantidade inicial apenas, sem ajuste/versionamento posterior; UI orienta ação inexistente. | SOMENTE FRONTEND para formulário/feedback, BACKEND para confirmação; não considerar resolvido por simples mudança de texto. |
| Eixos independentes, porém enumerações curtas | E06: não incluem expiração/retorno/reconciliação e estados financeiros completos. | IMPLEMENTADO no requisito de separação; PARCIAL para fluxos completos. Nunca usar “Finalizado” como confirmação de repasse. |
| Código não integrado não vale como evidência | Mock `dashboard.mock.ts`, dados estáticos do catálogo e placeholder de rotas não substituem serviços/jornadas. | Não contabilizar como IMPLEMENTADO o comportamento ausente. |

## C. Ofertas comerciais / Marketplace

### Respostas objetivas

1. **Temos cadastro de produtos com preço; não há modelo funcional de Offer.** O marketplace é navegável e tem catálogo próprio, mas não administra ofertas do fornecedor.
2. **Produto e oferta ainda não são entidades separadas no código.** Existem dois modelos de produto, ambos com preço, sem vínculo canônico de Offer.
3. **Ações funcionando localmente:** cadastrar/editar preço e metadados de produto; importar XLSX; imagem opcional; pesquisar/filtrar; visualizar detalhes. Nenhuma ação de publicação/pausa/encerramento/revalidação de oferta foi encontrada.
4. **Pode começar com mocks:** contrato de apresentação, listagem/formulário de ofertas vinculadas ao produto, validade/condições, estados de erro/vazio/permissão, seleção de organização, elegibilidade visual e testes de vencimento. Isso é nova implementação, não simples ativação de algo já pronto.
5. **Depende do Backend para conclusão:** identidade canônica, autorização por organização/ação, decimal monetário, persistência/versionamento, lifecycle autorizado, revalidação de oferta no checkout, auditoria e integração comprador/fornecedor. Nenhuma rota de mutação real pode ser declarada pronta sem OpenAPI.
6. **Reaproveitamento:** tabela, pesquisa, modal, validações e imagens de Produtos ajudam. Recomenda-se, como decisão de UI e não requisito adicional, uma seção/aba ou tela de **Ofertas**, mantendo preço/condição da oferta separados do cadastro canônico. Não basta renomear Produtos para Ofertas. A escolha de rota é de UX; não foi implementada aqui.

### Mínimo documentado e fronteiras

Mínimo de R19: referenciar produto do catálogo, identificar fornecedor, definir preço/validade/condição, permitir manutenção por autorizado e impedir uso de inválida/vencida. Quantidade de ofertas por produto/fornecedor, formato de condições, publicação direta versus curadoria e enumeração de lifecycle estão indefinidos nos cards ativos.

R19 não especifica literalmente publicar/despublicar/ativar/pausar/encerrar. A26 arquivado menciona revisão/aprovação/bloqueio/revalidação por papel, mas isso **não autoriza acrescentar todo esse workflow ao fornecedor**. A25 arquivado limita validade a 24h; essa restrição precisa de ratificação antes de ser imposta. No servidor, R19 exige NUMERIC; o frontend pode usar representação adequada ao contrato, mas `number`/formatação em reais não comprova precisão decimal de domínio.

Integração com comprador é parte de ROT-021/A27 contextual. Não é correto exigir ofertas restritas à própria organização na vitrine do comprador: ali se visualizam ofertas de fornecedores autorizadas/elegíveis. O isolamento de administração e a visibilidade comercial são políticas diferentes.

## D. Capacidade de atendimento

### O que existe e o que cada número significa

| Conceito | Implementação atual | Limite |
|---|---|---|
| Físico declarado | `SupplierProduct.stock`; exibido como físico na tabela | Valor local informado no cadastro, não estoque medido/ERP em tempo real |
| Reservado | Soma de `stockReservation.items` para organização/produto | Não tem ciclo implementado de expiração, liberação, despacho e retorno |
| Disponível | Físico declarado menos reservado | Não verifica janela de produção, preparação, expedição ou capacidade |
| Capacidade operacional | **Ausente** | Sem quantidade própria, unidade, data/janela, reservado, saldo ou UI |
| Capacidade de autorização | Permissões mock `products:view`, `orders:view` etc. | É autorização de acesso, não throughput operacional |

R20 **já define** que capacidade é por data/janela. Não é uma incógnita se existe período. O que falta definir é unidade (pedidos, volumes, kg etc.), âmbito (organização/produto/outro recurso), duração/fechamento da janela, cálculo de consumo/reserva, sobreposição e regras de atualização de slot comprometido.

O fornecedor não consegue criar/editar slots, consultar lotação por janela ou ver capacidade associada ao pedido. O aceite só verifica estoque. Não há teste de insuficiência de capacidade, saldo negativo de slot ou concorrência nesse recurso.

**Implementação mínima proposta, após essas decisões:** consulta/declaração de slots por data/janela, limite/reserva/disponível retornados pelo serviço, validação de entrada e feedback de conflito, vínculo legível do pedido com a janela comprometida. Uma seção em Estoque ou área própria de Capacidade é reaproveitamento possível, não imposição dos cards. Não calcular autorização de aceite apenas no componente e não reservar capacidade por suposição a partir da quantidade física.

Pergunta objetiva ao domínio: **“Qual é a unidade e o âmbito de CapacitySlot e qual comando reserva, consome e libera sua capacidade por data/janela, inclusive quando o fornecedor reduz um limite já comprometido?”**

## E. Retornos e devoluções

### Fluxo previsto e responsáveis

| Etapa documentada | Fornecedor | Logística / operação | Comprador | Backend |
|---|---|---|---|---|
| Falha ou recusa na entrega — R40 | Acompanhar ocorrência autorizada; visualização é suporte de UX à jornada, não comando do motorista | Motorista registra tentativa/recusa, motivo/contato/evidência conforme autorização; mercadoria fica sob sua custódia | Pode participar da recusa/contato; comando exato precisa do contrato | Valida tentativa, audita e inicia retorno sem transferir ao comprador ou liberar pagamento |
| Retorno físico — R40/R41 | Identifica retorno destinado à sua organização e recebe quando ocorrer | Transporta e registra transferência de custódia | Não recebe custódia por mera falha | Registra eventos e responsável; não converte “retornando” em “recebido” automaticamente |
| Recebimento/conferência — R41 | **Ação explícita:** receber, conferir volumes/condição e informar resultado | Participa da transferência conforme regra autorizada | Sem decisão de conferência atribuída por esses cards | Reconcilia custódia/estoque na mesma transação; ausente não volta ao saldo |
| Divergência/dano/ausência — R41/R42 | Conferência precisa permitir expressar o que foi constatado; autorização/formato do comando de divergência precisam ser acordados; A49 contextual explicita prazo para divergir | Investiga e decide o que exigir capacidade operacional específica | Acompanha solução autorizada | Não altera estoque por divergência não reconciliada; mantém coerência com financeiro |
| Extravio ou dispensa — R42 | Não há concessão automática dessa decisão ao fornecedor | Decisão autorizada com capacidade, motivo e auditoria; A50 contextual a situa no portal interno | Não substitui autoridade operacional | Executa comando/efeitos autorizados, sem editor genérico de estados |
| Silêncio em um dia útil — R41/demo | Deve poder visualizar prazo e resultado quando fornecidos | Operação acompanha exceção se aplicável | Sem decisão inferida | Job/calendário reconcilia conforme regra da demo; browser não decide por ausência de clique |
| Reentrega ou reembolso — R43 | Acompanha desdobramento e eventual nova preparação autorizada; não escolhe a solução pelo comprador | Replaneja logística da reentrega autorizada | **Escolhe** uma reentrega integral ou reembolso após reconciliação/dispensa | Impõe no máximo uma reentrega; falha leva a reembolso, sem terceira tentativa; escolha não expira na demo |
| Cancelamento/efeitos financeiros — ROT-044/ROT-048 | Somente solicita ou registra incidente conforme estágio e autorização; cancelamento unilateral após aceite não está concedido | Intervenção excepcional autorizada e auditada | Ação permitida conforme contrato | Lock/versão contra separação; CANCELLED não é REFUNDED e COMPLETED não é repasse |

O README atribui expressamente recebimento/conferência ao fornecedor e timeline autorizada à plataforma. Os cards não definem um formulário de evidência obrigatória do fornecedor para toda conferência. Não transformar imagem de produto em prova de retorno nem exigir foto sem requisito. Campos de evidência, acesso e retenção precisam seguir o contrato de ocorrência, carregados sob autorização.

### Funcionalidades ausentes e local adequado

Não existem Return, lista de pedidos retornando, motivo logístico, transferência de retorno, recebimento/conferência, registro de quantidades/condição, divergência, investigação, dispensa, solução ou timeline de evidências. O financeiro possui somente estado exibido; não há conciliação ou reembolso implementado. `OrderRejectionModal` cobre **recusa comercial inicial**, não R40.

**Sugestão de UX:** começar integrado a Pedidos por área/aba específica de Retornos e um detalhe/comando de conferência. Reutilizar `OrderDetailsModal` para identificação/itens e tabela/filtros do histórico. Não colocar retornos abertos entre “Finalizados” só para reutilizar o arquivo, nem sobrecarregar o estado comercial com estados de custódia. Tela própria de Retornos torna-se adequada se o volume, SLA e evidências exigirem fila dedicada; nenhuma rota específica está imposta nos cards ativos.

O mínimo obrigatório ao fornecedor, sustentado por R27/R41, é acesso ao retorno e operação de recebimento/conferência de volumes e condição. A apresentação de motivo, andamento e histórico é uma recomendação de UX derivada dessa operação/README; o conjunto exato de dados visíveis precisa da política de autorização. Decisões de extravio/dispensa e escolha de reentrega/reembolso não devem aparecer como botões irrestritos do fornecedor.

## F. Backlog priorizado do Frontend

Ordem proposta. “Com mocks” significa desenvolver UI/contrato de apresentação e testar cenários locais após autorização; invariantes de domínio permanecem no servidor. Os caminhos novos citados são **propostas**, não arquivos criados nesta auditoria.

### P0 — Fechar fronteiras e contratos mínimos

- **Objetivo:** ratificar cards ativos versus arquivados, papel do catálogo canônico, lifecycle de oferta, unidade/consumo de capacidade, estados e comandos de Return.
- **Arquivos prováveis:** documentação de integração; futuros tipos gerados; adaptadores dos serviços de Produtos/Pedidos/Estoque. Não migrar dados existentes para “adequar” automaticamente.
- **Aceite:** Product/Offer/InventoryBalance/CapacitySlot/Order/Return distinguíveis; estados/ações por papel documentados; ownership da reserva antes/depois do aceite e tratamento de conflitos definidos; campos monetários e temporais acordados.
- **Backend:** contrato e responsável por invariantes; não precisa de todos os endpoints implementados para iniciar UI.
- **Complexidade:** média. **Imediato com mocks:** sim, após decisões; a definição não deve ser inventada no mock.

### P1 — Ofertas do fornecedor

- **Objetivo:** criar/editar ofertas vinculadas ao produto canônico com preço, validade e condições, exibindo apenas ações autorizadas/acordadas.
- **Arquivos prováveis:** nova `features/offers/{models,services,hooks,components,pages}`; reaproveitar `SupplierProducts`, `ProductImage`, `ProductManagementDialog`; rotas/permissões somente quando a UX for aprovada.
- **Aceite:** CRUD comercial exigido por R19, isolamento, validação, vazio/erro/permissão, validade visível, oferta inválida/vencida não utilizável, persistência mock, teste entre organizações; pedidos aceitos não reprecificados ao editar oferta. Não acrescentar aprovação própria ou botões de pausa sem regra.
- **Backend:** vínculo canônico/tenant, decimal, lifecycle, auditoria, revalidação e persistência/versionamento.
- **Complexidade:** alta. **Imediato com mocks:** sim com contrato mínimo.

### P1 — Declaração de estoque e capacidade por janela

- **Objetivo:** completar administração de saldo declarado e implementar CapacitySlot separadamente de quantidade física.
- **Arquivos prováveis:** `SupplierInventory`, novos formulários/hooks/serviços de declaração e capacidade; `stockReservation` apenas via contrato/adaptador compatível; alinhar mensagem de `ProductFormModal`.
- **Aceite:** consultar/declarar slots por data/janela, unidade clara, limite e compromisso, validação de entradas; declaração de saldo após cadastro com motivo/horário se previstos pelo contrato; saldo comprometido não reduzido silenciosamente; versão desatualizada produz feedback e recarga; preservar reservas e histórico existentes.
- **Backend:** cálculo e confirmação atômica de reservas de estoque/capacidade, versão e restrições. Um mock não pode ser prova de concorrência entre clientes reais.
- **Complexidade:** alta. **Imediato com mocks:** UI sim; unidade e política de slots primeiro.

### P1 — Consulta e conferência de retornos

- **Objetivo:** fila/detalhe para o fornecedor visualizar e conferir retornos reais destinados à sua organização.
- **Arquivos prováveis:** nova `features/returns/{models,services,hooks,components}`; integração em `SupplierOrders`/detalhes e componentes de tabela já existentes.
- **Aceite:** distinguir retornando/recebido/conferência conforme estados acordados; listar volumes/condição; confirmar resultado com proteção contra reenvio; motivo/histórico autorizado visível; ausente/divergente não soma saldo em tela; erros e ações limitadas por organização/papel; SLA somente se fornecido. Não alterar status financeiro para “resolvido” ao receber fisicamente.
- **Backend:** Return, transferência, reconciliação, versão/idempotência, efeito de estoque/custódia, calendário de silêncio e auditoria.
- **Complexidade:** alta. **Imediato com mocks:** sim, sem simular garantia transacional de produção.

### P2 — Divergências e acompanhamento das soluções

- **Objetivo:** registrar a constatação permitida ao fornecedor e acompanhar investigação/reconciliação/decisão.
- **Arquivos prováveis:** detalhe de Return, timeline autorizada e adaptadores de anexos/ocorrências; não reutilizar storage de foto de produto como evidência privada.
- **Aceite:** quantidades/condição registradas sem efeito automático no saldo; motivo/resultado legíveis; não conceder extravio/dispensa ao fornecedor sem capacidade; reentrega/reembolso somente como acompanhamento no fornecedor, com escolha no comprador; nenhuma terceira tentativa.
- **Backend:** permissões, schemas de divergência/evidência, decisão operacional e efeitos financeiros; outros portais executam suas ações próprias.
- **Complexidade:** alta. **Imediato com mocks:** consulta e feedback sim; comandos dependem de contrato de permissões.

### P2 — Completar caixa operacional e condições congeladas

- **Objetivo:** cobrir lacunas de R25/R28 e integração futura sem quebrar a fila já implementada.
- **Arquivos prováveis:** `SupplierOrders`, confirmação/recusa/detalhes, serviços e tipos de pedidos; testes de contratos e concorrência.
- **Aceite:** preço/quantidade/unidade/condições do snapshot, endereço/janela/capacidade quando disponibilizados; expiração canônica e 409 com feedback; falha pré-despacho/reagendamento por comando nominal; ações vêm do contrato. Preservar comercial/financeiro/custódia e impedir transições inválidas; não calcular duas horas úteis no browser como autoridade.
- **Backend:** `allowed_actions`, snapshots, prazo/calendário, versão, jobs/locks, falha/reagendamento/cancelamento e notificações.
- **Complexidade:** média para UI, alta para validação integrada. **Imediato com mocks:** sim para estados e erros; regra transacional não.

### P2 — Integrar as fontes e validar o contrato

- **Objetivo:** conectar fornecedor/comprador/estoque ao Backend e eliminar divergências entre mocks por meio de adaptadores explícitos.
- **Arquivos prováveis:** cliente HTTP/tipos OpenAPI, hooks existentes, `catalog`, `purchases`, `cart`, auth/layout e testes de integração.
- **Aceite:** catálogo do comprador reflete somente ofertas elegíveis; edição comercial não modifica snapshots; API nega acesso cruzado; preço decimal não é recalculado como autoridade no cliente; saldo/capacidade/retorno sincronizados com servidor; pagination/erro/request ID reais; execução de regressões e evidências de ponta a ponta.
- **Backend:** endpoints e ambiente de integração, não apenas mocks ou tipos propostos.
- **Complexidade:** alta. **Imediato com mocks:** adaptadores e testes de contrato sim; certificação integrada não.

## G. Contratos necessários do Backend

### Já documentado versus ainda a acordar

**Documentado nos cards ativos:** convenção `/api/v1`, JSON snake_case, erro `code/message/details/request_id`, X-Request-Id/paginação/OpenAPI (ROT-005); GET `/products` e `/offers` (ROT-021); Order/OrderItem, versão, 409 e `allowed_actions` (ROT-024); accept/refuse e expiração (R25); InventoryBalance/CapacitySlot (R20); Return e reconciliação (R41); no máximo uma reentrega integral (R43). Isso documenta necessidades e alguns nomes, **não schemas HTTP completos**.

**Não comprovado aqui:** rotas exatas de mutação, payloads/respostas, nomes de todos os campos, enums, cabeçalhos de idempotência/versão, estratégia de paginação concreta e permissões por comando. Não declarar um endpoint implementado só por aparecer em um card. Os caminhos abaixo, exceto GET `/products` e `/offers`, são descrições de operações requeridas, **não URLs inventadas como contrato existente**.

| Área | Modelo/dados/operação necessários | Origem documentada | Contrato a confirmar / autoridade |
|---|---|---|---|
| Identidade/organização | Usuário autenticado, vínculos, organização fornecedora e capacidades de leitura/comando | R27/R19/R20; README | Como selecionar tenant; autorização server-side e códigos de acesso negado |
| Produto canônico | Product, ID estável, unidade fixa, dados válidos, snapshot/versionamento | ROT-018 | Lista/detalhe e alterações administrativas; conversão dos produtos locais sem migração implícita |
| Oferta | Offer ligado a Product e fornecedor, preço, validade, condição; lista/detalhe/criação/alteração | R19/ROT-021 | Status/lifecycle, cardinalidade, curadoria, `valid_until` ou nome canônico equivalente, representação decimal e ações por papel |
| Elegibilidade/vitrine | GET `/products` e `/offers`, filtros/paginação e elegibilidade autorizada | ROT-021 | Formato do envelope; frete/janela/quantidade comparáveis se ratificado A27; rejeição da compra vencida pelo servidor |
| Estoque declarado | InventoryBalance com declarado, reservado, disponível; consulta/declaração | R20; timestamp/versão explicitados em A28/A29 contextual | Precisão/unidade, versão de concorrência, timestamp e evento de ajuste; nunca prometer físico de ERP |
| Capacidade | CapacitySlot por data/janela e limite/compromisso/disponível; consulta/declaração | R20 | Unidade, âmbito, sobreposição, timezone, redução de slot, marcos de reserva/consumo/liberação |
| Pedido/decisões | Order/OrderItem, snapshot das condições, eixos independentes, versão, ações permitidas; aceitar/recusar | ROT-024/R25/R27 | Enumerações, organização/IDs de oferta/janela, endereço autorizado, estrutura 409 e operação idempotente; impedir reserva dupla ao conectar checkout |
| Prazo/expiração | Data-limite autoritativa e fuso; expiração de duas horas úteis, disputa com aceite | R25; exibição R27 | Calendário/feriados e início do prazo; clock de referência; resposta de expirado; job/locks e notificação no servidor |
| Preparação | Separar, pronto, falha pré-despacho, reagendar; cancelamento por estágio | R28/ROT-044 | Schemas/motivos/versão e interação entre falha/cancelamento/despacho; estados finais datados pela origem |
| Tentativa/retorno | DeliveryAttempt/Return, pedido/itens, origem/motivo/contato/evidência, responsável e eventos | ROT-033/R40/R41 | Comando do motorista versus consulta do fornecedor; política de dados privados; paginação da fila/timeline |
| Receber/conferir/reconciliar | Recebimento real, volumes/condição/resultado, versão e ID de operação | R41 | Campos de esperado/recebido/ausente e condição; confirmação de transferência; mutação de custódia/estoque atômica; evento/hora/ator de domínio |
| Divergência/investigação/dispensa | Divergência sem alteração indevida, decisão autorizada, motivo, auditoria | R42 | Quem pode registrar versus decidir; enums, evidências, estado intermediário e critério de reconciliação |
| Silêncio na demo | Prazo de um dia útil e job de aceitação/reconciliação | R41 | Marco inicial e efeito exato da aceitação silenciosa, sem transformar carga ausente em estoque |
| Solução/financeiro | Escolha autorizada de uma reentrega integral ou reembolso; contador/efeitos idempotentes | R43/ROT-048 | Relação entre pedidos de origem/reentrega, estado financeiro próprio, limites, trilha e dados visíveis ao fornecedor |
| Auditoria/evidências | Evento append-only com ator/organização/motivo/versão/origem/request ID/hora; timeline privada | ROT-016/R40/R42; README | Consulta/cursores e autorização; upload/download se necessário. Não substituir evidência por `ProductImage` local |

**Reserva/capacidade, estoque/custódia de retorno, reembolso e corrida de expiração são invariantes do servidor.** O frontend apresenta comandos e resultados; não deve confirmá-los apenas no localStorage. Não é preciso impor agora uma biblioteca específica: TanStack Query é sugerida nos cards, não um critério de aceite que sua ausência isoladamente faça falhar.

## H. Recomendações para o Trello

Recomendações a partir do **snapshot exportado**, sem mover ou marcar cartões.

| Card/subconjunto | Situação no JSON / recomendação | Condição para avançar |
|---|---|---|
| R27 completo | Está **Em testes**; para a descrição integral, recomendo **Em Andamento**, ou manter Em testes somente com divisão de escopo aprovada e pendências vinculadas explicitamente | Ofertas, capacidade e recebimento/conferência de retornos ainda faltam em UI; não são meras pendências de endpoint |
| Subconjunto atual: Dashboard, produtos, estoque/aceite local, fila, detalhes, histórico e prazos | Pode permanecer **Em testes** e ser **pronto para PR do frontend simulado**, com revisão do diff e execução atual dos checks | Não incluir exclusão, ofertas, capacidade, retorno ou integração como entregues; reunir evidências de regressão e revisão |
| R19 e R20 | Backlog; planejar partes UI em Em Andamento após contrato mínimo | Testar fluxo com mocks e depois autorização, elegibilidade e transações reais; nenhum deles concluído por causa do cadastro Produtos |
| R25 e R28 | Backlog; reconhecer partes locais existentes sem encerrar card de domínio | Expiração/calendário/lock/versão/financeiro e falha/reagendamento ausentes; comprovar também implementação no Backend |
| R40/R41/R42/R43 | Backlog; manter pendências e responsáveis por portal/Backend/Mobile | Não confundir recusa comercial com entrega recusada nem histórico de finalizados com retorno; respeitar dono de cada comando |
| A26/A27/A29/A36/A50 e demais arquivados | **Não reabrir nem marcar concluídos automaticamente** | Responsável define se são referência, supersedidos ou escopo futuro; shortLink evita colisão de números |
| ROT-005 | Exportado como aprovado/merged | Não reclassificar só porque OpenAPI não está no frontend; pedir artefato/URL e verificar consumo quando autorizado |

Nenhum dos cards amplos de ofertas/capacidade/retornos pode ser considerado concluído **com base apenas neste checkout**. Aprovado/merged exige evidência da entrega correspondente e do processo de revisão; estado de lista ou arquivamento não a substitui.

## I. Perguntas pendentes de negócio

Somente decisões que as fontes não resolveram:

1. **Baseline e escopo:** R27 ativa absorve todos os detalhes dos cards Dashboard arquivados ou apenas suas descrições ativas? É permitido fechar um primeiro incremento local e vincular ofertas/capacidade/retornos a entregas seguintes, ou precisam estar na mesma entrega? A categoria canônica de alimentos secos/unidade fixa já está descrita na ROT-018; os mocks de construção não a substituem.
2. **Oferta:** publicação é direta pelo fornecedor ou exige curadoria Admin? Quais estados/comandos são permitidos e quantas ofertas podem existir para um produto/fornecedor? Qual formato de condição comercial e limite de validade valem na baseline ativa? O teto de 24h do card arquivado foi ratificado?
3. **Capacidade:** qual unidade, âmbito e duração da janela; como tratar sobreposição, redução de limite já reservado e quais fases reservam, consomem e liberam capacidade? “Capacidade por data/janela” já está documentado e não precisa ser redescoberto.
4. **Retorno/conferência:** qual marco inicia o dia útil; fornecedor registra somente recebimento e resultado ou conclui uma reconciliação autorizada pelo servidor? Quais quantidades/condições precisam ser declaradas e quais permitem reposição, quarentena ou investigação? Silêncio não pode gerar estoque de mercadoria ausente: qual resultado deve prevalecer nessa combinação?
5. **Permissões de exceção:** quais papéis podem declarar divergência, decidir extravio/dispensa e autorizar o efeito financeiro? Não há base para dar todas essas ações a qualquer fornecedor.
6. **Dados do retorno:** quais motivos, contatos, evidências e eventos são apropriados/visíveis ao fornecedor e em quais conferências é obrigatório fornecer evidência adicional? A política não deve ser inferida do upload de imagem de produto.

As URLs e schemas concretos da API são pendências técnicas da seção G; a escolha de reentrega/reembolso já pertence ao comprador (R43), e a capacidade já possui data/janela (R20). Não é necessário voltar a perguntar essas decisões resolvidas.

**Encerramento da auditoria:** manter os fluxos locais existentes; priorizar contratos → Ofertas → declaração/Capacidade → recebimento/Retornos → divergências/acompanhamento → integração e regressões. Nenhuma implementação foi iniciada. Aguardar autorização para a próxima etapa.
