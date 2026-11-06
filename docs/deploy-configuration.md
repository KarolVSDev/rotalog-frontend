# Configuração de build do RotaLog

O `.env` local existente pode ser mantido. Para desenvolvimento simulado, configure
`VITE_AUTH_MODE=mock` e execute `npm run dev`. Para desenvolvimento integrado, use
`VITE_AUTH_MODE=api` e a URL explícita da API em `VITE_API_URL`.

Todo `npm run build`, independentemente do nome do modo Vite, exige:

- `VITE_AUTH_MODE=api`;
- `VITE_API_URL` absoluta HTTP ou HTTPS, sem credenciais, query string ou fragmento.

Não há fallback para mock ou localhost em builds. Uma URL local explicitamente
configurada continua permitida para validação local do build. Para publicação,
configure a URL HTTPS real da API no ambiente do build. Variáveis do processo
de build têm precedência sobre os arquivos `.env`.

As variáveis Vite são incorporadas no build e são públicas no navegador. Não
inclua tokens ou credenciais. Mudar variáveis apenas no servidor que serve os
arquivos estáticos não reconfigura um bundle já gerado: gere um novo build.

Validação local: execute lint, typecheck, build e testes. Em seguida, use
`npm run preview` para conferir o artefato com a API local configurada. Na
hospedagem final, configure o fallback SPA para `index.html` e confirme HTTPS,
CORS e cookies antes de disponibilizar acesso. Esta alteração não inicia deploy
nem implementa infraestrutura de hospedagem.
