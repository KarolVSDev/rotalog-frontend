# RotaLog V5 — Bundles e carregamento inicial

## Diagnóstico

Baseline: commit `ccc4886`, build com o ambiente local existente, sem alteração de
variáveis. Valores decimais de kB reportados pelo Vite:

| Arquivo antes | kB | kB gzip |
| --- | ---: | ---: |
| index-CWBLBl57.js | 1207,17 | 346,46 |
| rolldown-runtime-Dd_uD5pT.js | 1,10 | 0,62 |
| DashboardCharts-CV1-By2D.js | 43,21 | 12,98 |
| exceljs.min-DgbhWywh.js | 929,56 | 256,44 |
| index-dtpjAese.css | 64,00 | 12,47 |

O router importava todas as páginas estaticamente. Isso incluía as páginas
administrativas com Recharts e as jornadas legadas, mesmo ao abrir o comprador.
ExcelJS já possuía importação dinâmica dentro de `readProductSpreadsheet` e
`downloadProductTemplate`; não foi encontrado import estático dessa biblioteca.

## Divisão aplicada

`lazyPage` usa React.lazy e Suspense, com status acessível de carregamento.
Os guards permanecem externos às páginas: uma página protegida não precisa ser
baixada para decidir se o usuário pode acessá-la. Os layouts e os errorElement
existentes foram preservados; falhas de download chegam à tela segura de erro.

As páginas foram agrupadas em autenticação, comprador API, fornecedor API,
legado, administrador e planejador. Cada grupo reutiliza o mesmo import dinâmico
entre suas páginas. Chunks comuns são extraídos automaticamente pelo bundler.
Não houve alteração de chunkSizeWarningLimit, contratos, autenticação ou regras.

ExcelJS continua sendo baixado apenas ao ler uma planilha ou baixar o modelo.
O aviso de chunk grande permanece para essa dependência; ela não integra o
bootstrap. Não há promessa de redução do volume total de todas as jornadas:
a melhoria é baixar apenas o código necessário para a jornada acessada.

## Validação manual

1. Execute `npm run build` e `npm run preview` com a configuração local existente.
2. No painel Network, desative cache e abra `/login`; confirme ausência de chunks
   AdminPages, PlanningDashboard, SupplierPortal, LegacyPages e ExcelJS.
3. Entre com cada perfil e navegue pelas telas autorizadas. Abra URLs internas
   diretamente e atualize a página. Confirme o estado de carregamento em rede lenta.
4. No desenvolvimento mock intencional, abra produtos do fornecedor e o diálogo
   XLSX. ExcelJS deve ser solicitado ao baixar o modelo ou selecionar XLSX válido.
5. Bloqueie no navegador o chunk de uma página ainda não visitada e navegue até
   ela: deve aparecer a tela de erro com opção de tentar novamente.

As validações automatizadas interceptam a API; nenhum comando operacional real
é necessário para conferir o carregamento. As medidas abaixo representam bytes
do build e gzip calculado localmente, não latência, LCP ou compressão do servidor.

## Build depois

| Arquivo | kB | kB gzip | Bootstrap |
| --- | ---: | ---: | --- |
| PageHeader-8DiM2zQr.js | 0.83 | 0.49 | - |
| DemoDataBadge-Buyi1ose.js | 0.87 | 0.57 | - |
| config-Dli0fL3y.js | 0.94 | 0.53 | Sim |
| rolldown-runtime-Dd_uD5pT.js | 1.11 | 0.63 | Sim |
| orderDeadline-CZ3aSenC.js | 2.67 | 1.45 | - |
| OrderOperationalSummary-1dCUNF-u.js | 6.50 | 2.38 | - |
| jsx-runtime-BpzPEenQ.js | 7.90 | 2.99 | Sim |
| PasswordChangeDialog-z_7SltZv.js | 12.71 | 5.24 | - |
| AuthPages-BOlxclaN.js | 15.74 | 4.09 | - |
| ApiCatalogDetails-CQmxztax.js | 18.40 | 7.10 | - |
| AdminPages-Bo0J5dvp.js | 40.00 | 11.54 | - |
| DashboardCharts-DbIkqOky.js | 43.33 | 12.95 | - |
| PlanningDashboard-DzWzrew_.js | 56.06 | 14.99 | - |
| BuyerPortal-Bn8AqS-C.js | 59.28 | 16.28 | - |
| index-FF9jUxph.css | 64.05 | 12.34 | - |
| SupplierPortal-C3hOf0Xb.js | 108.45 | 29.34 | - |
| LegacyPages-DCIEbX-7.js | 158.25 | 41.11 | - |
| BarChart-Dxu6JTRb.js | 358.84 | 102.88 | - |
| index-DGBENYFA.js | 368.88 | 115.33 | Sim |
| exceljs.min-DgbhWywh.js | 929.57 | 255.57 | - |

Bootstrap JavaScript (entrada e modulepreloads do HTML): 378.82 kB; 119.48 kB gzip. Exclui chunks carregados pela rota acessada.
