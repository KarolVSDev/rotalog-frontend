# Histórico local de estoque — ROT-027

## Operações registradas

- Aceite com reserva validada: um evento `reservation` por produto agregado da reserva, com pedido, quantidade, horário do `reservedAt` e origem `order-acceptance`.
- Cadastro com quantidade inicial positiva: um evento `initial-stock`, origem `product-create`.
- Importação confirmada com quantidade inicial positiva: evento `initial-stock`, origem `xlsx-import`.

O cadastro com estoque zero não movimenta saldo. A edição atual não permite alterar quantidade física: mudar nome, preço, categoria, unidade ou imagem não gera eventos. Recusa, separação e prontidão não liberam reservas nem baixam o estoque no fluxo atual; portanto não geram eventos. Não há registros demonstrativos, migração ou reconstrução de reservas antigas.

## Persistência e consistência

Os eventos são explícitos e gravados com o agregado que originou a operação:

- `StockReservation.movements`, dentro de `rotalog:supplier-orders:v1`;
- `SupplierProduct.stockMovements`, dentro de `rotalog:supplier-products:v1:<organização>`.

Cada operação salva saldo e eventos em **um único `localStorage.setItem`**. Se a validação ou essa gravação falhar, nenhum dos dois é salvo. Não há segunda gravação de histórico, rollback entre chaves ou janela com evento sem saldo correspondente. Os leitores apenas projetam os eventos existentes, validando organização, quantidades, vínculo com reserva e duplicidades. Nomes e unidades dos eventos são snapshots do catálogo na operação.

IDs de eventos são chaves de idempotência compostas: tipo + organização + pedido + produto para reservas; tipo + organização + produto para saldo inicial. O aceite continua com o mutex entre abas e valida o saldo novamente dentro dele. Reservas e eventos existentes são preservados pela proteção contra snapshots obsoletos de pedidos.

O IndexedDB usado pelo aceite é **somente um mutex**, não uma transação com o localStorage. Depois que o callback conclui a gravação síncrona, um eventual aborto do mutex não pode reportar falha no aceite já salvo. Não se afirma garantia transacional distribuída entre esses armazenamentos.

Atualizações na própria aba usam os eventos existentes de Pedidos/Produtos; outras abas usam `storage`. Ambos os saldos e o histórico leem as mesmas fontes. Pesquisa e filtros apenas selecionam os registros já gravados. Ordenação: horário decrescente, com ID como desempate.

## Limites e futura API

O histórico começa nas operações realizadas após esta implementação. Ele não explica saldos/reservas anteriores e não deve ser usado para reconstruí-los.

Os registros compartilham a cota do localStorage com pedidos e produtos. Se ela se esgotar, a operação falha sem salvar saldo ou evento; não há descarte automático de histórico para liberar espaço.

Uma gravação atômica de uma chave não equivale a uma transação de banco: não há atomicidade entre catálogo e pedidos, garantia de durabilidade de servidor ou auditoria imutável. O catálogo mantém sua API síncrona atual; gravações simultâneas de catálogo por abas diferentes ainda podem sofrer sobrescrita, como antes. Evento e saldo inicial permanecem no mesmo agregado, mas isso não elimina atualizações perdidas. Não há novo controle concorrente global para operações de produtos/imagens.

A futura API deve salvar saldo/reserva e evento na mesma transação, impor idempotência e organização no servidor, e fornecer paginação, ordenação e filtros. O adaptador `SupplierStockMovementsService` e o hook isolam a consulta local. Novas operações de baixa, liberação ou ajuste físico devem primeiro ser implementadas no domínio e só então emitir seu próprio evento transacional. Exclusão futura de produtos/pedidos também precisará preservar os eventos fora do agregado.
