# ROT-027 — Pendências para o Backend

## Atualização — refinamento do portal do fornecedor

- **Rotas:** existe `GET /api/v1/delivery-routes/{route_id}/location`, autorizado ao fornecedor participante do pedido. Falta uma consulta autorizada para descobrir a rota por `SupplierOrder`, ou o vínculo na resposta do pedido. `POST /supplier-orders/{order_id}/delivery-route` cria a rota e não deve ser usado como consulta. Coleta, despacho, entrega e comprovantes continuam sem fluxo operacional completo. O portal não simula localização, transporte ou entrega.
- **Minha conta:** nome, e-mail e organização permanecem somente leitura. Faltam comandos de atualização desses campos, com autorização por usuário/organização e regras de validação definidas.
- **Senha:** `POST /api/v1/auth/password/change` recebe `current_password` (1–1.024 caracteres) e `new_password` (12–1.024), retorna 204 e revoga todas as sessões. O Frontend não repete o comando automaticamente; distingue `INVALID_CREDENTIALS` (senha atual incorreta) de sessão expirada e de resultado incerto por falha de comunicação. Após sucesso, limpa a sessão local e encaminha ao login.
- **Produtos:** abas separam ofertas, catálogo e depósitos, preservando os contratos. O cadastro direto de produto pelo fornecedor continua dependente de endpoint específico; não foi introduzido fluxo de aprovação administrativa.

As notas acima complementam a lista histórica abaixo. Nenhuma nova rota de Backend é declarada como implementada por esta documentação.

**Projeto:** RotaLog  
**Módulo:** Jornada do Fornecedor — Web

## 1. Cadastro de produtos pelo fornecedor

O fornecedor deve conseguir cadastrar novos produtos diretamente no catálogo oficial do RotaLog, **sem aprovação administrativa**.

**Precisamos:**
- Endpoint para cadastrar e publicar produtos pelo fornecedor autenticado.
- Validação para evitar produtos duplicados.
- Registro de quem cadastrou o produto.
- Produto disponível no catálogo compartilhado para todos os fornecedores.
- Regras para impedir alterações indevidas em produtos compartilhados.

Após cadastrar o produto, o fornecedor poderá criar sua oferta e configurar o estoque.

## 2. Gestão de ofertas

Atualmente, conseguimos criar, editar preços e pausar ofertas.

**Precisamos:**
- Consultar ofertas ativas e pausadas.
- Consultar detalhes de uma oferta pelo ID.
- Reativar ofertas pausadas.
- Evitar criação de ofertas duplicadas.
- Garantir que tentativas repetidas de criação não gerem duplicatas.

## 3. Estoque

A consulta e o ajuste de estoque já estão integrados.

**Precisamos:**
- Endpoint para consultar o histórico real de ajustes, reservas e liberações de estoque.
- Identificar corretamente o produto associado a uma oferta pausada.

## 4. Capacidade operacional

**Precisamos:**
- Endpoint definitivo para cadastrar janelas de capacidade, sem utilizar rotas de demonstração.
- Consultar as janelas de capacidade do próprio fornecedor.
- Definir regras de alteração, cancelamento e sobreposição de horários.

## 5. Pedidos e entregas

O fluxo do fornecedor já está integrado até o estado `READY_TO_DISPATCH` (Pronto para coleta).

**Precisamos:**
- Registro de coleta pelo entregador.
- Atualização do pedido para `IN_TRANSIT`.
- Registro de entrega pelo entregador.
- Confirmação de recebimento pelo comprador.
- Atualização do pedido para `DELIVERED` após as confirmações necessárias.
- Datas e histórico dos eventos de entrega.
- Tratamento de entregas parciais.
- Arquivamento automático dos pedidos entregues após 7 dias, mantendo-os disponíveis no histórico.

O fornecedor apenas acompanha a entrega. As confirmações serão feitas pelo entregador e pelo comprador.

## 6. Identificação dos pedidos

**Precisamos:**
- Campo `order_number` gerado pelo Backend, único e permanente, para identificar os pedidos sem depender do UUID.

---

## Observações

- As funcionalidades listadas são pendências de integração, não endpoints já disponíveis.
- A equipe de Backend deverá definir e informar os contratos das novas APIs.
- Após a disponibilização dos endpoints, a equipe de Frontend realizará as integrações necessárias.
- Não será necessário criar um painel administrativo para aprovação de produtos.
# Integração da Jornada do Comprador — modo API

O portal admite `BUYER_ADMIN` e mantém `SUPPLIER_OPERATOR`. A autorização combina papel, vínculo com a organização ativa e capacidades de `/me`: `catalog:read`, `checkout:create` e `purchase:read`. O Backend permanece responsável pela autorização final. Nenhum identificador de organização é fixado no cliente.

As rotas existentes `/`, `/produto/:productId`, `/comprador/carrinho`, `/comprador/compras` e `/comprador/compras/:purchaseId` utilizam telas API quando `VITE_AUTH_MODE=api`. O marketplace exige login para consultar dados protegidos. O modo API não monta o carrinho mock nem utiliza os produtos ou compras simulados das telas antigas.

Contratos consumidos (prefixo `/api/v1`):

- `GET /products` e `/products/{id}`: catálogo publicado, pesquisa e paginação.
- `GET /offers`: preço oficial, oferta, fornecedor, depósito, mínimo e disponibilidade. O produto não contém preço ou estoque.
- `GET /capacity-slots?warehouse_id=...`: janelas do depósito; o cliente verifica prazo e capacidade restante, com revalidação antes da reserva.
- `POST /checkouts`: de 1 a 50 ofertas distintas, um fornecedor e um depósito, `accepts_partial: false`. A criação reserva estoque e capacidade.
- `GET /checkouts/{id}`: consulta de resultado, versão, total, validade e compra resultante.
- `POST /checkouts/{id}/confirm-payment`: pagamento exclusivamente sintético, mediante ação explícita e `expected_version`.
- `GET /purchases` e `/purchases/{id}`: histórico da organização e detalhes oficiais dos pedidos.

O carrinho e as intenções de checkout usam armazenamento de sessão próprio, separado por usuário, organização e dataset. Não contêm credenciais. Trocar de identidade desmonta os estados da sessão anterior. Os preços são mantidos em texto decimal; valores exibidos na revisão vêm do checkout e são formatados sem ponto flutuante.

Criação e pagamento utilizam chaves distintas de idempotência, persistidas antes do envio. Não há reenvio comercial automático, inclusive em resposta 401. Uma criação com resultado incerto só é reenviada por ação explícita com a mesma chave e conteúdo. Um pagamento incerto exige consulta do checkout antes de nova confirmação; se já existir compra, a interface abre seus detalhes sem repetir pagamento. Recarregar a página preserva a intenção pendente. Não iniciar outra compra enquanto o resultado estiver incerto.

Não existe contrato de cancelamento de checkout consumido neste fluxo. Sair da página, remover estado local ou atingir o prazo no relógio do navegador não comprova liberação de reserva. A revisão do carrinho após expiração só é liberada quando o Backend retorna `EXPIRED`.

Após pagamento, a compra contém os `SupplierOrder` participantes. O fornecedor os consulta em `/fornecedor/pedidos`; os detalhes do comprador mantêm o UUID completo do pedido em área expansível para correlação. Pagamento, preparação e prontidão não são apresentados como entrega comprovada.

Validação automatizada: testes unitários e Playwright com interceptação da API para comprador e regressões do fornecedor. Nenhuma compra, reserva, alteração de estoque ou pagamento real deve ser executado pelas suítes. O teste manual integrado com escritas permanece sujeito a autorização específica.

## Refinamento de pedidos e compras — primeira etapa logística

Esta etapa modifica somente a apresentação web. Mantém rotas, permissões, consultas, comandos, idempotência e versões já validados. O Kanban preserva suas transições e ganha mensagens de preparação e recuperação de filtros. Detalhes separam informações comerciais, quantidades oficiais, lotes e situação logística. O histórico do comprador apresenta os pedidos e seus valores oficiais individualmente, sem calcular um estado de entrega para a compra.

`ACTIVE` é apresentado como “Em andamento”; `CANCELLED`, como “Cancelada”. Estados de checkout também recebem descrições em português. Os valores originais continuam nas respostas, filtros e payloads; códigos desconhecidos têm apresentação neutra e ficam disponíveis nos detalhes técnicos, sem gerar novas transições. `READY_TO_DISPATCH` significa prontidão; não comprova coleta, transporte ou entrega. `COMPLETED` de uma rota não equivale a pedido entregue.

Não foi criada timeline de eventos: o contrato atual não fornece histórico com atores e horários. As telas apresentam apenas o estado e as quantidades retornadas. Campos posteriores à preparação que atualmente são projetados como zero não são usados como comprovação operacional. Não existem pontos GPS, comprovantes, horários de coleta ou transportes simulados no modo API.

Dependências pendentes do Backend, conforme diagnóstico e V5 §§9, 14–16, 21.7–21.8 e 24:

- Consulta autorizada para descobrir rota por pedido, listagem e detalhe de rotas para participantes web. O `POST /supplier-orders/{id}/delivery-route` cria uma rota e não pode substituir uma consulta.
- Papel, vínculos e capacidades reais de `ROUTE_PLANNER`, além dos contratos de frota, planejamento, revisão, publicação e despacho. O futuro módulo web seguirá o padrão visual do fornecedor, com autorização própria; seu login e suas operações não são implementados nesta etapa.
- Coleta e transferência de custódia, despacho quantitativo e sincronização coerente entre pedido, fulfillment e rota.
- Tentativas e resultados de entrega, recebimento, provas vinculadas às linhas e arquivos privados autorizados; retorno e reconciliação.
- Timeline auditável com ator e horário, política de acesso temporal ao GPS e evolução do protocolo de tracking. A consulta existente de última posição não representa rastreamento completo.

O aplicativo de `DRIVER` pertence à equipe mobile. Não são criadas telas web ou ações que executem comandos do motorista. Planejamento manual e logística demonstrativa devem ser diferenciados de otimização automática e offline completo do piloto. O Documento Funcional V3 continua pendente de disponibilização para fechamento das decisões de negócio.

Validação desta etapa utiliza testes de apresentação e E2E interceptados, incluindo contraste/acessibilidade e capturas desktop/mobile. Nenhuma operação do pedido sintético de referência é executada pelas suítes.
