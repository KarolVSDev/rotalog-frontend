# RotaLog — Solicitação técnica de evolução do Backend de logística V5

**Destinatário:** Equipe de desenvolvimento Backend  
**Origem:** Equipe Frontend Web  
**Assunto:** Contratos necessários para planejamento, atribuição e acompanhamento de entregas  
**Prioridade:** Alta para a integração logística da V5  
**Status:** Proposta técnica para avaliação e alinhamento

---

## 1. Contexto

O RotaLog já possui um fluxo integrado e validado em ambiente de demonstração:

1. O administrador cadastra e publica produtos canônicos.
2. O fornecedor cadastra ofertas comerciais e registra estoque.
3. O comprador realiza uma compra simulada.
4. O fornecedor recebe, aceita e prepara o pedido.
5. O pedido chega ao estado `READY_TO_DISPATCH` (Pronto para coleta).

Esse fluxo foi validado com o pedido de referência **#236B4D58**, referente a uma caixa de macarrão espaguete, com valor de R$ 89,90.

A próxima etapa consiste em integrar o módulo de logística web ao Backend V5, permitindo atribuição de motorista, consulta de rotas e acompanhamento da entrega.

A auditoria identificou que o Backend já possui endpoints básicos de criação e execução de rotas, mas ainda não oferece todos os contratos necessários para uma jornada completa e recuperável.

## 2. Endpoints existentes que devem ser preservados

| Método | Endpoint | Finalidade |
|---|---|---|
| POST | `/api/v1/supplier-orders/{order_id}/delivery-route` | Criar uma rota para um pedido pronto e atribuir motorista |
| GET | `/api/v1/driver/delivery-routes` | Consultar rotas do motorista autenticado |
| POST | `/api/v1/driver/delivery-routes/{route_id}/start` | Iniciar rota atribuída |
| POST | `/api/v1/driver/delivery-routes/{route_id}/complete` | Concluir rota iniciada |
| POST | `/api/v1/driver/delivery-routes/{route_id}/locations` | Registrar coordenadas GPS |
| GET | `/api/v1/delivery-routes/{route_id}/location` | Consultar última localização autorizada |

**Observações:**

- A criação de rota exige `driver_id` e `expected_version`.
- Cada rota está atualmente associada a um único pedido.
- A rota precisa ser iniciada pelo motorista atribuído.
- O envio de GPS exige `Idempotency-Key`.
- A consulta de localização retorna somente a última coordenada.
- A conclusão da rota não altera automaticamente o estado do pedido.
- O contrato atual de pedidos não informa o `route_id`.

Solicitamos preservar esses contratos, evitando alterações incompatíveis com os consumidores existentes.

---

## 3. Prioridade P0 — Funcionalidades essenciais

### P0.1 — Consultar motoristas elegíveis

**Problema:** o Frontend precisa informar um `driver_id` ao criar uma rota, mas não existe endpoint para descobrir motoristas elegíveis.

**Endpoint proposto:**

`GET /api/v1/logistics/eligible-drivers`

Parâmetros sugeridos:

- `supplier_order_id`: UUID do pedido, para validar a elegibilidade no contexto da entrega.
- `page`: número da página.
- `page_size`: quantidade de registros.

Exemplo ilustrativo de resposta:

```json
{
  "items": [
    {
      "id": "uuid-do-motorista",
      "display_name": "Motorista Sintético",
      "is_active": true,
      "eligible": true
    }
  ],
  "page": 1,
  "page_size": 20,
  "total": 1
}
```

**Regras solicitadas:**

- Retornar somente motoristas ativos e autorizados para o contexto do pedido.
- Validar o vínculo organizacional e/ou operacional definido pela arquitetura.
- Não expor dados pessoais desnecessários.
- Aplicar as mesmas regras de elegibilidade no momento da atribuição.
- Definir como tratar motoristas que já possuem rotas ativas.
- Garantir que o usuário não consiga consultar motoristas fora do seu escopo.

**Permissões propostas:** `SUPPLIER_OPERATOR` no escopo dos próprios pedidos e `ROTALOG_ADMIN` dentro do escopo administrativo autorizado.

**Critério de aceite:** o fornecedor consegue selecionar um motorista elegível em uma lista, sem digitar UUID manualmente.

### P0.2 — Consultar rotas do fornecedor

**Problema:** após criar uma rota, o fornecedor não consegue listá-la nem recuperá-la após atualizar a página.

**Endpoint proposto:**

`GET /api/v1/supplier/delivery-routes`

Filtros sugeridos:

- `supplier_order_id`
- `status`
- `page`
- `page_size`

Exemplo ilustrativo:

```json
{
  "items": [
    {
      "id": "uuid-da-rota",
      "supplier_order_id": "uuid-do-pedido",
      "driver": {
        "id": "uuid-do-motorista",
        "display_name": "Motorista Sintético"
      },
      "status": "ASSIGNED",
      "version": 1,
      "last_location": null
    }
  ],
  "page": 1,
  "page_size": 20,
  "total": 1
}
```

**Regras solicitadas:**

- Retornar somente rotas associadas aos pedidos da organização autorizada.
- Disponibilizar estado, motorista, pedido, versão e datas relevantes.
- Permitir filtrar por pedido e estado.
- Garantir paginação consistente.
- Não exigir que o Frontend armazene IDs de rotas em memória ou `localStorage`.
- Definir a visibilidade de rotas concluídas e canceladas.

**Critério de aceite:** uma rota criada permanece consultável pelo fornecedor após logout, novo login ou recarregamento da página.

### P0.3 — Consultar rota por pedido

**Problema:** o Frontend possui o UUID do pedido, mas não consegue descobrir sua rota associada.

**Endpoint proposto:**

`GET /api/v1/supplier-orders/{order_id}/delivery-route`

**Resposta sugerida:** contrato de rota existente, contendo `id`, `supplier_order_id`, `driver_id`, `status`, `version` e `last_location`, conforme os schemas definidos pelo Backend.

**Regras solicitadas:**

- Validar acesso ao pedido antes de retornar a rota.
- Retornar `404` quando não existir rota ou ela não for visível ao usuário.
- Respeitar a restrição atual de uma rota por pedido.
- Permitir recuperação após resposta perdida da criação.

**Critério de aceite:** o Frontend consegue consultar o pedido e descobrir se já existe uma rota, evitando tentativas de criação duplicadas.

### P0.4 — Recuperação segura da criação de rota

**Problema:** o POST de criação de rota não declara uma chave de idempotência. Se a requisição for processada e a resposta se perder, o Frontend não consegue saber com segurança se a rota foi criada.

**Solicitação:**

Definir uma das estratégias abaixo, ou uma alternativa equivalente:

- Suporte a `Idempotency-Key` na criação da rota, com comportamento documentado para repetição da mesma requisição.
- Recuperação garantida pelo endpoint de consulta de rota por pedido, combinada com tratamento de conflitos de versão e rota já existente.

**Regras solicitadas:**

- Não permitir rotas duplicadas para o mesmo pedido.
- Documentar o tratamento de `409`.
- Garantir comportamento seguro sob requisições concorrentes.
- Não exigir repetição automática de uma operação de resultado incerto.

**Critério de aceite:** após timeout ou perda de resposta, o Frontend consegue identificar o resultado da operação sem gerar duplicidade.

---

## 4. Prioridade P1 — Acompanhamento de entregas

### P1.1 — Descoberta da rota pelo comprador

**Problema:** a API autoriza o comprador a consultar a localização de uma rota associada à sua organização, mas a resposta da compra não fornece o UUID da rota.

**Proposta preferencial:**

Incluir uma referência logística nos contratos de detalhe de compra/pedido, preservando compatibilidade.

Exemplo ilustrativo:

```json
{
  "delivery_route": {
    "id": "uuid-da-rota",
    "status": "IN_PROGRESS"
  }
}
```

A equipe Backend deverá definir em qual nível essa associação pertence, especialmente quando uma compra possuir pedidos de fornecedores diferentes.

**Alternativa:** criar um endpoint de acompanhamento baseado no UUID do pedido pertencente à compra.

**Critério de aceite:** o comprador acessa “Minhas compras”, abre o pedido e consegue descobrir sua rota sem conhecer previamente um UUID logístico.

### P1.2 — Consulta de acompanhamento

**Endpoint existente a reutilizar:**

`GET /api/v1/delivery-routes/{route_id}/location`

Solicitamos avaliar se o contrato atual é suficiente ou se deve ser complementado com um endpoint de resumo logístico.

O Frontend precisa apresentar:

- Estado da rota.
- Última localização, quando existir.
- Horário do último registro.
- Indicador `is_stale`.
- Informação clara sobre dados sintéticos.
- Situação de indisponibilidade de localização.

**Regras solicitadas:**

- Não retornar coordenadas de outra organização.
- Não confundir ausência de GPS com falha na entrega.
- Definir a política de consulta periódica.
- Não representar `COMPLETED` automaticamente como “Pedido entregue”.
- Não prometer rastreamento contínuo se o Backend só fornecer a última posição.

**Critério de aceite:** comprador e fornecedor conseguem visualizar o acompanhamento permitido pelo Backend, inclusive após recarregar a página.

### P1.3 — Definir o ciclo de vida da entrega

Atualmente existem estados logísticos de rota, incluindo:

- `ASSIGNED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`

Entretanto, a conclusão da rota não atualiza automaticamente o pedido.

Solicitamos uma decisão formal sobre:

1. Quando o pedido passa de pronto para coleta para em transporte.
2. Qual evento comprova que a coleta ocorreu.
3. O que significa concluir uma rota.
4. Qual evento confirma a entrega ao comprador.
5. Quem pode registrar essa confirmação.
6. Como tratar entregas não realizadas.
7. Como os estados de pedido e rota permanecem consistentes.

**Critério de aceite:** o Frontend consegue distinguir claramente “Pronto para coleta”, “Em transporte” e “Entregue” com base em estados reais, sem inferências.

---

## 5. Prioridade P2 — Gestão operacional avançada

### P2.1 — Cancelamento e reatribuição

Solicitamos avaliar contratos para:

- Cancelar uma rota ainda não iniciada.
- Reatribuir motorista quando necessário.
- Registrar motivo da alteração.
- Preservar histórico de auditoria.
- Impedir reatribuições incompatíveis com o estado da rota.
- Aplicar controle de concorrência por versão.

A definição dos endpoints e transições deverá ser aprovada pela equipe Backend.

### P2.2 — Planejamento com múltiplas entregas

O modelo atual associa uma rota a um único pedido.

Para suportar planejamento de entregas com múltiplas paradas, será necessário definir:

- Associação de vários pedidos a uma rota.
- Sequência das paradas.
- Endereços e restrições operacionais.
- Capacidade de carga.
- Janela de atendimento.
- Regras de organização e depósito.
- Estados por parada.
- Replanejamento.
- Responsabilidade pela otimização.

**Essa evolução exige decisão arquitetural.** Não recomendamos adaptar o modelo atual para múltiplas paradas sem revisão do domínio e dos contratos.

### P2.3 — Histórico de localização

Avaliar, para uma etapa futura:

- Consulta de pontos anteriores.
- Política de retenção.
- Frequência de atualização.
- Paginação por intervalo de tempo.
- Limites de precisão e privacidade.
- Controle de acesso.
- Tratamento de registros fora de ordem.

O Frontend não precisa dessa funcionalidade para a primeira versão de acompanhamento por última localização.

---

## 6. Matriz de permissões solicitada

| Operação | Fornecedor | Motorista | Comprador | Admin RotaLog |
|---|---|---|---|---|
| Consultar motoristas elegíveis | Próprios pedidos | Não | Não | Escopo autorizado |
| Criar/atribuir rota | Próprios pedidos | Não | Não | Escopo autorizado |
| Listar rotas | Própria organização | Próprias rotas | Não | Escopo autorizado |
| Consultar rota de pedido | Próprios pedidos | A definir | Próprios pedidos, via contrato apropriado | Escopo autorizado |
| Iniciar/concluir rota | Não | Apenas atribuída | Não | Não, salvo decisão explícita |
| Enviar GPS | Não | Apenas atribuída | Não | Não |
| Consultar última localização | Rotas autorizadas | Rotas atribuídas | Rotas de seus pedidos | Escopo autorizado |
| Cancelar/reatribuir | A definir | Não | Não | A definir |

**Observação:** essa matriz é uma proposta para validação, não uma declaração de que todas essas permissões já estão implementadas.

A auditoria também identificou que `ROUTE_PLANNER` aparece nos mocks legados do Frontend, mas não existe no enum de papéis do Backend V5 analisado.

Solicitamos decidir formalmente se o planejamento será responsabilidade de `SUPPLIER_OPERATOR` e/ou `ROTALOG_ADMIN`, ou se será criado um perfil específico. Não recomendamos introduzir `ROUTE_PLANNER` somente no Frontend.

---

## 7. Requisitos transversais

Todos os novos contratos devem observar:

**Autorização e isolamento**

- Validar identidade, sessão, papel e organização no Backend.
- Não confiar exclusivamente no cabeçalho `X-Organization-Id`.
- Evitar exposição de motoristas, pedidos e rotas de outras organizações.
- Documentar o escopo de `ROTALOG_ADMIN`.

**Consistência e concorrência**

- Preservar `expected_version` nas mutações relevantes.
- Documentar erros `409`.
- Garantir unicidade de rota por pedido enquanto essa regra permanecer vigente.
- Definir comportamento para requisições repetidas e respostas incertas.

**Contratos**

- Publicar schemas no OpenAPI.
- Utilizar identificadores UUID completos.
- Documentar enums e transições de estado.
- Manter formatos de paginação consistentes.
- Preservar compatibilidade com os consumidores atuais sempre que possível.

**Auditoria e observabilidade**

- Registrar criação, atribuição, início, conclusão e alterações de rota.
- Registrar ator, horário, recurso e resultado.
- Não expor dados sensíveis em logs.
- Permitir rastrear falhas de autorização e conflitos operacionais.

**Dados de demonstração**

- Preservar a distinção entre dados sintéticos e dados reais.
- Não gerar coordenadas fictícias como se fossem rastreamento físico.
- Não alterar dados existentes sem migração e estratégia de compatibilidade aprovadas.

---

## 8. Critérios mínimos de testes do Backend

Solicitamos testes automatizados para:

1. Listagem de motoristas elegíveis dentro do escopo autorizado.
2. Bloqueio de motoristas inativos ou inelegíveis.
3. Bloqueio de acesso entre organizações.
4. Criação de rota para pedido `READY_TO_DISPATCH`.
5. Rejeição de pedido em estado inválido.
6. Conflito de versão (`409`).
7. Tentativa de criar rota duplicada.
8. Recuperação da rota após criação.
9. Listagem de rotas do fornecedor com filtros e paginação.
10. Consulta de rota pelo comprador autorizado.
11. Bloqueio de consulta de localização de outra organização.
12. Consulta sem ponto GPS disponível.
13. Consulta com localização obsoleta (`is_stale`).
14. Conclusão de rota sem confirmação indevida de entrega.
15. Comportamento após timeout ou resposta incerta.

Os testes devem preservar os fluxos existentes do motorista e os contratos consumidos pelo aplicativo mobile.

---

## 9. Entregas esperadas da equipe Backend

Solicitamos que a equipe avalie e retorne:

- Confirmação dos endpoints propostos ou alternativas arquiteturais.
- Schemas de request e response definitivos.
- Matriz de permissões aprovada.
- Regras de elegibilidade de motoristas.
- Definição do vínculo entre pedido, rota e motorista.
- Política de recuperação/idempotência.
- Definição das transições de estados de entrega.
- Atualização do OpenAPI.
- Testes automatizados correspondentes.
- Previsão de entrega por prioridade P0, P1 e P2.

## 10. Sequência recomendada

**Entrega 1 — P0: atribuição e recuperação**

Implementar descoberta de motoristas, consulta de rotas, consulta por pedido e recuperação segura de criação.

Resultado esperado: fornecedor consegue atribuir motorista a um pedido pronto e consultar a rota posteriormente.

**Entrega 2 — P1: acompanhamento**

Expor associação logística ao comprador e definir a integração entre estados de rota e pedido.

Resultado esperado: comprador e fornecedor conseguem acompanhar o estado logístico e a última localização autorizada.

**Entrega 3 — P2: operação avançada**

Definir cancelamento, reatribuição, múltiplas paradas e histórico de localização.

Resultado esperado: evolução do módulo para planejamento e gestão operacional mais completos.

---

## 11. Considerações finais

A integração comercial e operacional do RotaLog já foi validada até a etapa **Pronto para coleta**.

A equipe Frontend pode desenvolver os componentes visuais e preparar os repositories tipados, mas a implementação completa de atribuição e acompanhamento depende dos contratos de descoberta e recuperação descritos nesta solicitação.

**Solicitamos priorizar os itens P0**, pois são os bloqueios imediatos para tornar a área de Rotas funcional no portal do fornecedor.

Nenhuma alteração de Backend, banco de dados ou contratos existentes está sendo executada por esta solicitação. Os endpoints novos, exemplos de JSON e permissões propostas deverão ser avaliados e aprovados pela equipe responsável antes da implementação.