# Revisão final dos critérios de aceite — ROT-027

## Fonte dos critérios

Revisão baseada nos dois critérios explicitados pelo usuário: prazos e estados independentes. A busca no Trello conectado por `ROT-027` e `fornecedor` não retornou cartões. Não foi possível confrontar o checklist original nem marcar o cartão como aprovado. Nenhuma escrita foi feita no Trello.

## Prazos

- O modelo contém `acceptanceDeadline` e `timeZone`, opcionais. Os mocks atuais não possuem prazo real. O botão de teste também não inventa prazo.
- Cards novos e detalhes mostram ausência de prazo explicitamente e não geram contador nessa situação. O fuso ausente também é explicitado.
- Quando há timestamp válido com offset/Z, a interface mostra o prazo no fuso fornecido e um contador atualizado a cada segundo enquanto aguarda aceite. O contador para em zero e informa “Prazo encerrado”; após decisão comercial, não exibe tempo restante.
- Timestamp inválido ou sem offset não produz contagem. Fuso inválido usa America/Manaus apenas para **exibição**, com mensagem explícita; não altera o campo persistido.
- O vencimento não foi convertido em recusa automática ou nova regra de bloqueio de aceite. Essa regra não existe no serviço atual e depende do contrato de negócio/backend. O contador é informativo.

## Estados independentes

`commercialStatus`, `financialStatus` e `custodyStatus` possuem tipos próprios e campos separados. A etapa do Kanban é uma projeção de comercial/custódia, não uma fonte que preencha os três estados.

- Aceite/recusa atualizam o comercial e os registros correspondentes, preservando financeiro e custódia.
- Separação/prontidão atualizam a custódia; preservam comercial e financeiro. O campo legado `status` continua compatível com o fluxo existente.
- O modal mostra os três campos reais. Um campo ausente aparece como “Não informado”; custódia não é inferida de `status`. Mesmo em recusados, os estados registrados continuam visíveis, com indicação de ausência de ações logísticas.
- Não existe fluxo de pagamento real nesta etapa; estados financeiros dos mocks são dados demonstrativos independentes.

## Histórico

Usa `rejection.rejectedAt` nas recusas e o campo opcional `completedAt` em entregues. Pedidos sem evento datado ficam em “Conclusão/recusa não informada”, nunca no mês de criação por suposição. Esses registros não entram no filtro de período, mas permanecem pesquisáveis e consultáveis. Não há migração nem gravação automática de datas em pedidos antigos. O produtor de uma data real de entrega continua pendente da integração futura.

## Verificação

Testes de cálculo cobrem prazo ausente/válido/inválido, fuso inválido, contagem, vencimento e datas finais sem fallback. Testes dos serviços verificam preservação dos estados independentes no aceite, recusa e preparação. Playwright cobre contagem com relógio controlado, modal, estados antigos, histórico mensal, filtros, persistência, isolamento e acessibilidade, além da matriz de regressão em seis resoluções.
