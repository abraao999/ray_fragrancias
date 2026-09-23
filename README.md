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
cd api
cp .env.example .env
npm install
npm run dev
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

## O que já está implementado

- Vitrine e catálogo de perfumes.
- Página de produto.
- Carrinho.
- Cálculo de frete por CEP em rota Node.
- Painel do dono com cadastro de produto e upload de foto.
- Produtos e pedidos no MongoDB.
- Cadastro/login de usuários com JWT.
- Primeiro usuário cadastrado vira dono/admin.
- `/admin` protegido para usuário admin.
- Criação de preferência de pagamento no Mercado Pago.

## Observação

O cálculo de frete atual é uma regra local para desenvolvimento. Ele já está isolado em `api/src/routes/shipping.js`, pronto para trocar por Correios, Melhor Envio ou outra API.

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
```

Você não precisa configurar `NEXT_PUBLIC_API_URL` na Vercel, porque o frontend usa `/api` por padrão e chama a API no mesmo domínio.

Se quiser apontar para uma API externa, aí sim configure:

```env
NEXT_PUBLIC_API_URL=https://sua-api-externa.com
```

Para testar o mesmo build usado na Vercel:

```bash
npm run build:vercel
```
