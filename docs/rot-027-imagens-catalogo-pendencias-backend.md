# Imagens canônicas do catálogo — exibição

O backend local já implementa `images` e `primary_image` em `ProductResponse`,
`product_image` em `OfferResponse` e galeria autenticada. Esta etapa integra
somente a exibição da principal nos catálogos e detalhes dos três portais.

O componente `AuthenticatedProductImage` baixa PNG/JPEG pelo proxy existente
`GET /api/v1/products/{id}/images/{image_id}/content`, com bearer e organização.
Somente caminhos canônicos relativos são aceitos; redirecionamentos são bloqueados.
O conteúdo é apresentado por uma URL temporária de Blob, revogada na troca de
contexto, no encerramento da sessão ou ao desmontar. Não há cache persistente.

Listagens carregam sob demanda com IntersectionObserver; em navegadores sem esse
recurso, usam carregamento imediato. Ausência de metadados, URL não confiável ou
falha de download mantém o placeholder. A versão implantada pode ainda não incluir
esses campos, por isso os tipos frontend os mantêm opcionais.

Upload e gerenciamento de galeria ficam para uma etapa posterior. O cadastro
administrativo continua sem upload. O fluxo local/legado de IndexedDB permanece
separado e não é usado para representar imagens canônicas da API.

A validação automatizada intercepta a API. A disponibilidade das imagens reais,
do armazenamento e do worker no ambiente implantado precisa ser conferida lá.
