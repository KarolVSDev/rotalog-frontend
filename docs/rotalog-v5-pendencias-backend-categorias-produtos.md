# RotaLog V5 — Pendências do backend: categorias e produtos

A auditoria identificou três funcionalidades necessárias para finalizar o portal administrativo.

## 1. Gerenciamento de categorias

- Criar entidade persistida para categorias, com identificador, nome, código estável e estado ativo/inativo.
- Disponibilizar consulta de categorias ativas.
- Permitir ao administrador criar, editar e desativar categorias.
- Impedir duplicidades.
- Preservar a categoria dos produtos existentes.
- Atualizar os schemas de entrada e resposta, atualmente limitados a `ALIMENTO_SECO_INDUSTRIALIZADO`.

## 2. Edição de produtos

- Criar endpoint para atualização dos campos permitidos.
- Utilizar `expected_version` para controle de concorrência.
- Preservar o ID e as imagens associadas.
- Definir quais atributos podem ser alterados após a publicação.
- Preservar ofertas e pedidos históricos.

## 3. Retirada de produtos do catálogo

- Disponibilizar comando administrativo de despublicação ou arquivamento.
- Impedir novas ofertas e compras de produtos retirados.
- Preservar pedidos já realizados.
- Definir o comportamento de checkouts pendentes.
- Permitir ao administrador consultar produtos em rascunho e retirados.

**Observação:** não recomendamos exclusão física de produtos com vínculos comerciais.

Solicitamos que a equipe confirme os contratos finais antes da integração com o frontend.
