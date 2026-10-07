# Ray Fragrâncias

Loja virtual web para perfumes com React, Node, MongoDB e checkout Mercado Pago.

## Como rodar localmente

```bash
cp .env.example .env
npm install
```

Suba o MongoDB local:

```bash
docker compose up -d mongo
```

Rode a API local:

```bash
cp api/.env.example .env
npm run api:dev
```

Em outro terminal, rode o frontend:

```bash
npm run dev:vercel
```

O frontend roda em `http://localhost:3000` e a API local roda em `http://localhost:4000`.

No arquivo `api/.env`, configure:

- `MONGO_URI`: conexão do MongoDB.
- `MERCADO_PAGO_ACCESS_TOKEN`: token da conta Mercado Pago.
- `FRONTEND_URL`: endereço do frontend.
- `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_BUCKET` e `CLOUDFLARE_R2_PUBLIC_URL`: credenciais para salvar fotos dos produtos no Cloudflare R2.

## O que já está implementado

- Vitrine e catálogo de perfumes.
- Página de produto.
- Carrinho.
- Cálculo de frete por CEP em rota Node.
- Integração de cotação com Melhor Envio, com fallback local quando não houver token.
- Painel do dono com cadastro de produto e upload de foto.
- Upload de fotos dos produtos no Cloudflare R2 quando as credenciais estiverem configuradas.
- Produtos e pedidos no MongoDB.
- Cadastro/login de usuários com JWT.
- Primeiro usuário cadastrado vira dono/admin.
- `/admin` protegido para usuário admin.
- Criação de preferência de pagamento no Mercado Pago.

## Observação

O cálculo de frete atual é uma regra local para desenvolvimento. Ele já está isolado em `server/src/routes/shipping.js`, pronto para trocar por Correios, Melhor Envio ou outra API.

## Deploy na Vercel

Este projeto está preparado para publicar o frontend e a API Node/Express na Vercel. O MongoDB fica separado no MongoDB Atlas.

Na Vercel, configure:

- Framework Preset: `Next.js`
- Build Command: `npm run build:vercel`
- Output Directory: `.next`
- Install Command: `npm install`

Variáveis de ambiente na Vercel:

```env
MONGO_URI=sua-url-do-mongodb-atlas
FRONTEND_URL=https://seu-projeto.vercel.app
MERCADO_PAGO_ACCESS_TOKEN=seu-token
JWT_SECRET=uma-chave-grande-e-segura
CLOUDFLARE_R2_ACCOUNT_ID=seu-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=sua-access-key-id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=sua-secret-access-key
CLOUDFLARE_R2_BUCKET=ray-fragrancias
CLOUDFLARE_R2_PUBLIC_URL=https://media.seudominio.com
CLOUDFLARE_R2_FOLDER=produtos
MELHOR_ENVIO_TOKEN=seu-token-melhor-envio
MELHOR_ENVIO_BASE_URL=https://www.melhorenvio.com.br
MELHOR_ENVIO_USER_AGENT=Ray Fragrancias (seu-email@dominio.com)
SHIP_FROM_CEP=cep-de-origem
DEFAULT_PACKAGE_WIDTH=12
DEFAULT_PACKAGE_HEIGHT=18
DEFAULT_PACKAGE_LENGTH=8
DEFAULT_PACKAGE_WEIGHT=0.35
```

Use em `CLOUDFLARE_R2_PUBLIC_URL` a URL pública do bucket, como `https://pub-xxxx.r2.dev` ou um domínio customizado. Não use o endpoint privado `https://<account-id>.r2.cloudflarestorage.com`, porque ele serve para a API/S3 e não abre imagens no navegador.

Você não precisa configurar `NEXT_PUBLIC_API_URL` na Vercel, porque o frontend usa `/api` por padrão e chama a API no mesmo domínio.

Se quiser apontar para uma API externa, aí sim configure:

```env
NEXT_PUBLIC_API_URL=https://sua-api-externa.com
```

Para testar o mesmo build usado na Vercel:

```bash
npm run build:vercel
```
