# Imagens canônicas do catálogo — exibição

O backend local já implementa `images` e `primary_image` em `ProductResponse`,
`product_image` em `OfferResponse` e galeria autenticada. Esta etapa integra
a exibição da principal nos catálogos e detalhes dos três portais e o gerenciamento administrativo da galeria.

O componente `AuthenticatedProductImage` baixa PNG/JPEG pelo proxy existente
`GET /api/v1/products/{id}/images/{image_id}/content`, com bearer e organização.
Somente caminhos canônicos relativos são aceitos; redirecionamentos são bloqueados.
O conteúdo é apresentado por uma URL temporária de Blob, revogada na troca de
contexto, no encerramento da sessão ou ao desmontar. Não há cache persistente.

Listagens carregam sob demanda com IntersectionObserver; em navegadores sem esse
recurso, usam carregamento imediato. Ausência de metadados, URL não confiável ou
falha de download mantém o placeholder. A versão implantada pode ainda não incluir
esses campos, por isso os tipos frontend os mantêm opcionais.

O cadastro administrativo aceita imagens opcionais e a galeria permite upload,
principal, ordenação e remoção de associação. O fluxo aguarda AVAILABLE após
confirmar o upload; HTTP 202 não significa conclusão. As tentativas podem ser
retomadas enquanto a tela permanece aberta, preservando o produto criado.
O fluxo local/legado de IndexedDB permanece separado e não representa imagens
canônicas da API. Armazenamento e processamento de produção dependem do backend.

A validação automatizada intercepta a API. A disponibilidade das imagens reais,
do armazenamento e do worker no ambiente implantado precisa ser conferida lá.
