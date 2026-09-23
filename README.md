# Ray Fragrâncias

Loja virtual web para perfumes com React, Node, MongoDB e checkout Mercado Pago.

## Como rodar o frontend

```bash
cp .env.example .env
npm install
npm run dev
```

O frontend roda em `http://localhost:3000`.

## Como rodar a API

Suba o MongoDB local:

```bash
docker compose up -d mongo
```

```bash
cd api
cp .env.example .env
npm install
npm run dev
```

A API roda em `http://localhost:4000`.

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
# ray_fragrancias
