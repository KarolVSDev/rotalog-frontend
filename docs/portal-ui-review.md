# ROT-027 — Revisão da interface do fornecedor

## Escopo e resoluções

Dashboard, Pedidos, Produtos e Estoque foram verificados em 1440, 1280, 1024, 768, 390 e 360 px de largura, no Edge com Playwright. As capturas de páginas usam altura de 900 px; testes móveis de navegação e modais também usam 740 e 800 px. A revisão combina medições de overflow e dimensões, testes por teclado, axe-core e inspeção de capturas representativas nas seis larguras.

## Problemas encontrados e correções

- O drawer móvel era apenas um overlay: não bloqueava o fundo pelo teclado, não gerenciava foco/Escape e não fechava ao navegar. Mantida a sidebar e adotado `dialog` nativo para sua apresentação móvel, com foco inicial, restauração, fechamento por botão/Escape/backdrop, links e mudança para desktop. Organização, Sair e guardas DEV foram preservados.
- Os overlays de detalhes mantinham o fundo interativo para teclado/leitores de tela. Agora são portais no body com o fundo `inert`, bloqueio de rolagem e restauração ao fechar. Os componentes e suas ações foram preservados.
- `calc()` sem espaços válidos em larguras/alturas de modais e filtro de disponibilidade. Corrigidas as expressões, mantendo limites de viewport e rolagem interna.
- Contraste insuficiente dos subtítulos sobre slate-100, indicação de rolagem e ações verdes. Ajustadas tonalidades e foco visível, mantendo as famílias de cores e textos de status.
- O reset global `font: inherit` fora de layers anulava tamanhos/pesos Tailwind em controles. A correção foi limitada aos elementos marcados do Portal do Fornecedor e seus portais; outras jornadas não receberam esse override.
- Rolagem de pedidos recentes, conteúdo dos detalhes do produto, itens de pedidos e prévia XLSX sem parada de teclado adequada. Adicionadas regiões nomeadas, foco visível e `tabIndex`.
- Faltava atalho para pular a navegação. Adicionado “Ir para o conteúdo”.
- Controles dos cabeçalhos ficavam apertados no tablet com sidebar. Passam a empilhar abaixo de 1024 px. Códigos curtos ficam inteiros; nomes, categorias e códigos excepcionais possuem quebra segura. Rodapés de importação permitem quebra de linha.
- Indicadores do Dashboard já tinham grade e alturas consistentes: os cálculos e componentes foram mantidos.

## Verificações

- As quatro páginas nas seis larguras, ausência de overflow horizontal da página e igualdade das alturas dos indicadores.
- Análise axe-core das páginas, cadastro e estados de modais/filtros: regras WCAG 2 A/AA e 2.1 AA.
- Menu móvel por Enter/Tab/Shift+Tab/Escape, links das quatro páginas, presença da organização/Sair e fechamento ao redimensionar.
- Detalhes, aceite, recusa, filtros, cadastro e importação com limites da viewport, devolução de foco e fundo bloqueado.
- Textos longos em 360 e 1024 px.
- Prévia de imagem PNG e importação de XLSX real com uma linha válida e outra inválida em 360 px. O arquivo de teste é uma fixture local gerada com ExcelJS, sem depender do carregamento CommonJS dessa biblioteca no processo de testes do Playwright.
- Suítes existentes de produtos, reservas, imagens, histórico, persistência, organização e atualização entre abas.

As capturas são gravadas em `test-results/portal-ui-*`, junto aos relatórios JSON de acessibilidade anexados pelo Playwright. Esses arquivos são locais e ignorados pelo Git. Podem ser regenerados com:

```sh
npm run test:e2e -- --workers=2 --timeout=60000
```

Resultado final: TypeScript aprovado; lint sem avisos; três suítes de serviço aprovadas; **23 testes de interface aprovados**; build aprovado. Nenhuma violação foi detectada pelo axe nas regras e estados cobertos. A inspeção visual das capturas representativas incluiu páginas, cadastro, drawer, recusa e importação móvel. O build mantém o aviso de chunk grande do ExcelJS.

## Arquivos desta revisão

- `src/shared/components/AppLayout.tsx`
- `src/shared/components/Sidebar.tsx`
- `src/shared/components/PageHeader.tsx`
- `src/shared/hooks/useModalBackground.ts` (novo)
- `src/index.css`
- `src/features/dashboard/components/RecentOrders.tsx`
- `src/features/orders/pages/SupplierOrders.tsx`
- `src/features/orders/components/OrderColumnFilter.tsx`
- `src/features/orders/components/OrderConfirmationModal.tsx`
- `src/features/orders/components/OrderRejectionModal.tsx`
- `src/features/orders/components/OrderDetailsModal.tsx`
- `src/features/products/pages/SupplierProducts.tsx`
- `src/features/products/components/ProductAvailabilityFilter.tsx`
- `src/features/products/components/ProductManagementDialog.tsx`
- `src/features/products/components/ProductFormModal.tsx`
- `src/features/products/components/ProductDetailsModal.tsx`
- `src/features/products/components/ProductImportModal.tsx`
- `src/features/inventory/pages/SupplierInventory.tsx`
- `src/features/inventory/components/StockMovementHistory.tsx`
- `tests/e2e/portal-ui.spec.ts` (novo)
- `tests/fixtures/products-ui.xlsx` (novo, planilha de teste)
- `package.json` e `package-lock.json` (axe-core para testes)
- `docs/portal-ui-review.md` (este relatório)

## Limites

As medições foram feitas em navegador Edge automatizado; a inspeção visual foi feita pelas capturas, sem sessão manual em dispositivo físico. Não houve teste com leitor de tela real, Safari ou Firefox. Axe não substitui uma auditoria manual completa de acessibilidade. O comportamento com zoom, teclados virtuais e configurações específicas de leitores de tela ainda exige validação em dispositivos reais.

Regras de negócio, serviços de estoque/pedidos, persistência, sincronização e rotas não foram modificados nesta revisão. O build pode manter o aviso existente de chunk grande do ExcelJS; otimização do bundle está fora deste escopo.
