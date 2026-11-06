# Elegibilidade do catálogo do comprador

O catálogo do comprador mostra produtos publicados que tenham ao menos uma oferta com `is_active`, preço positivo, `available_quantity` suficiente para `minimum_order_quantity` e quantidade vendável válida. Busca, contagem e paginação são aplicadas depois desse filtro. A busca considera nome, marca, categoria e fornecedor. O catálogo administrativo e o do fornecedor continuam consultando a listagem canônica sem esse filtro.

O detalhe direto, a comparação, a inclusão no carrinho e a validação do carrinho usam a mesma regra. Antes de criar o checkout, o frontend consulta novamente as ofertas; o backend continua responsável por validar estoque e capacidade transacionalmente.

## Pendência de validação no backend

O backend retorna os campos necessários para o filtro no frontend, mas o contrato monetário permite preço zero (`amount_minor >= 0`) e a criação do checkout não rejeita esse preço. Portanto, a regra da interface pode ser contornada por chamadas diretas à API. É necessária validação backend para exigir preço maior que zero no cadastro/alteração de ofertas e no checkout. Nenhum endpoint, modelo ou dado do backend foi alterado.

A API também pagina produtos e ofertas separadamente e não oferece uma consulta de catálogo já filtrada por oferta elegível. Para manter busca, total e paginação corretos, o frontend precisa carregar todas as páginas desses dois recursos antes de paginar o resultado. Um endpoint de catálogo comprador que aplique esses critérios no servidor é recomendado para evitar esse custo conforme o catálogo crescer.
