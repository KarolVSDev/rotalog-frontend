# Dashboard gerencial do fornecedor

O painel usa `useSupplierOrders` e `useSupplierInventory`, incluindo suas assinaturas de eventos locais e de `storage` entre abas. Todos os pedidos são filtrados pela organização ativa antes das agregações. Não há gravações para alimentar os gráficos; os identificadores visuais continuam usando o mecanismo existente de aliases.

- Indicadores: preservam os quatro predicados do Dashboard anterior.
- Pedidos por situação: usa `getOrderStage`, extraído sem mudança de comportamento do Kanban. Cada pedido pertence a uma única etapa; recusados entram em Finalizados.
- Filtro anual: anos derivados dos pedidos da organização ativa, incluindo o ano corrente, selecionado por padrão. Indicadores, situações e recentes usam o ano escolhido. A seleção é de interface e volta ao ano corrente ao recarregar ou trocar de organização.
- Pedidos por período: conta `SupplierOrder.date`, o campo de criação disponível no modelo, por dia. No ano corrente, a janela de 7/30/90 dias termina hoje (America/Manaus). Nos demais anos, termina em 31 de dezembro. O início é limitado a 1º de janeiro do ano escolhido, sem incluir pedidos de outros anos. O intervalo efetivo aparece no gráfico. Dias sem registros recebem zero. Datas sem horário preservam o dia informado; timestamps são convertidos ao fuso do painel.
- Catálogo: agrupa a disponibilidade atual retornada pelo hook de Estoque, que já desconta reservas e aplica os limites existentes, independentemente do filtro anual. O Dashboard não recalcula limites nem altera saldos.
- Recentes: ordenação por data decrescente, desempate pelo ID, limite de cinco registros, aliases existentes e link para Pedidos.

Recharts é carregado em um chunk sob demanda. Gráficos têm altura explícita, contêineres responsivos, tooltips e animações desativadas. Listas de contagens e uma tabela diária expansível oferecem alternativas textuais. Falhas de leitura são exibidas, evitando apresentar saldo zero como se a leitura tivesse sido bem-sucedida.

Limitações: o modelo atual registra a data de criação sem horário para os pedidos usuais; não existe histórico de transições para gráficos retrospectivos de status. O gráfico de situação representa o estado atual. A janela diária avança na próxima renderização/atualização do painel; não há temporizador à meia-noite. A futura API deverá fornecer datas e agregações com escopo por organização. O build mantém o aviso preexistente de tamanho do chunk de ExcelJS.

Validação: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` e `npm run test:e2e -- --workers=2 --timeout=60000`. Os testes cobrem métricas, etapas sem duplicação, janelas 7/30/90, fuso, isolamento, estados vazios, limite de recentes, atualização de outra aba e reserva real refletida no catálogo. A matriz Playwright/axe cobre 1440, 1280, 1024, 768, 390 e 360 px, com capturas em `test-results`.
