# Pedidos ativos e histórico

As duas abas consultam o mesmo `useSupplierOrders`, com sincronização por eventos locais e `storage`. Não há arquivo, chave de armazenamento ou cópia adicional para pedidos finalizados. Nenhum pedido é migrado ou alterado para aparecer no histórico.

`getOrderStage` é a classificação compartilhada: `completed` aparece somente em Histórico; as outras cinco etapas aparecem em Pedidos ativos. Ações operacionais continuam nos cards das etapas permitidas e os serviços mantêm suas validações. Histórico oferece apenas consulta pelo `OrderDetailsModal` existente.

O histórico agrupa os registros pela **data registrada de conclusão ou recusa**: `completedAt` para entregues e `rejection.rejectedAt` para recusados. `completedAt` é opcional e só deve ser fornecido pela origem real do evento; o frontend atual não registra entregas nem preenche esse campo retroativamente. Não se usa criação, reserva ou data atual como substituição. Meses aparecem em ordem decrescente, com contagem após os filtros. Datas ausentes ou inválidas ficam no grupo “Conclusão/recusa não informada”, sem inventar datas ou alterar o armazenamento. Timestamps são convertidos para America/Manaus.

Pesquisa global consulta ID completo, alias estável e comprador. Os filtros próprios do histórico selecionam entregues/recusados e intervalo inclusivo de datas de conclusão/recusa. Registros sem data não entram em filtros de período, mas seguem acessíveis sem esse filtro. Justificativa e motivo de recusa são exibidos quando registrados. Um intervalo invertido apresenta mensagem de validação.

Cada mês mostra 20 registros por página. São renderizados inicialmente seis grupos mensais, com botão para carregar mais seis. A agregação e filtragem continuam em memória, sobre o serviço local existente; uma futura API deve paginar e filtrar no servidor para volumes muito grandes. As abas e filtros voltam ao padrão após recarregar; os pedidos persistidos são preservados.

O build passa com aviso de chunks acima de 500 kB (entrada principal e ExcelJS); a carga dos gráficos continua separada sob demanda.

Abas seguem os papéis tablist/tab/tabpanel, com setas, Home e End. Grupos usam details/summary nativos, operáveis por teclado. Tabelas têm regiões de rolagem horizontal e cabeçalhos semânticos; o modal mantém o gerenciamento de foco existente.

Testes adicionais: agregações anuais e mensais, limites de ano, pesquisa, filtros, isolamento e imutabilidade em `tests/dashboard.test.cjs`; jornadas anuais e histórico em desktop/mobile em `tests/e2e/annual-history.spec.ts`; regressão de detalhes em `tests/e2e/supplier-stock.spec.ts`.
