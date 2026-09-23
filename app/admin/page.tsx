"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type User = {
  name: string;
  email: string;
  role: "customer" | "admin";
};

type Product = {
  _id: string;
  name: string;
  family: string;
  size: string;
  price: number;
  notes: string;
  stock: number;
  tag: string;
  imageUrl?: string;
  isActive: boolean;
};

type Order = {
  _id: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
    cep: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  total: number;
  status: "pending" | "paid" | "shipping" | "delivered" | "cancelled";
  createdAt: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const orderStatuses: Order["status"][] = ["pending", "paid", "shipping", "delivered", "cancelled"];
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function AdminPage() {
  const [photoName, setPhotoName] = useState("");
  const [message, setMessage] = useState("Painel pronto para operar a loja.");
  const [user, setUser] = useState<User | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [tab, setTab] = useState<"overview" | "products" | "orders">("overview");

  const lowStockProducts = useMemo(
    () => products.filter((product) => product.stock <= 3),
    [products]
  );
  const monthlyRevenue = useMemo(
    () =>
      orders
        .filter((order) => ["paid", "shipping", "delivered"].includes(order.status))
        .reduce((sum, order) => sum + order.total, 0),
    [orders]
  );
  const pendingOrders = useMemo(
    () => orders.filter((order) => ["pending", "paid"].includes(order.status)),
    [orders]
  );

  useEffect(() => {
    const token = window.localStorage.getItem("ray_token");

    if (!token) {
      setCheckingUser(false);
      return;
    }

    fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        setUser(data.user);
        if (data.user.role === "admin") {
          void loadAdminData();
        }
      })
      .catch(() => window.localStorage.removeItem("ray_token"))
      .finally(() => setCheckingUser(false));
  }, []);

  async function loadAdminData() {
    const [productsResponse, ordersResponse] = await Promise.all([
      fetch(`${apiUrl}/products?includeInactive=true`, { headers: authHeader() }),
      fetch(`${apiUrl}/orders`, { headers: authHeader() })
    ]);

    if (productsResponse.ok) {
      setProducts(await productsResponse.json());
    }

    if (ordersResponse.ok) {
      setOrders(await ordersResponse.json());
    }
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const url = editingProduct ? `${apiUrl}/products/${editingProduct._id}` : `${apiUrl}/products`;

    try {
      const response = await fetch(url, {
        method: editingProduct ? "PUT" : "POST",
        headers: authHeader(),
        body: formData
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Não foi possível salvar o produto.");
      }

      setMessage(`Produto "${data.name}" salvo com sucesso.`);
      setEditingProduct(null);
      form.reset();
      setPhotoName("");
      await loadAdminData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao salvar produto.");
    }
  }

  async function toggleProduct(product: Product) {
    const response = await fetch(`${apiUrl}/products/${product._id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeader()
      },
      body: JSON.stringify({ isActive: !product.isActive })
    });

    if (response.ok) {
      await loadAdminData();
      setMessage(product.isActive ? "Produto pausado na vitrine." : "Produto reativado na vitrine.");
    }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Excluir "${product.name}"? Essa ação remove o produto do banco.`)) {
      return;
    }

    const response = await fetch(`${apiUrl}/products/${product._id}`, {
      method: "DELETE",
      headers: authHeader()
    });

    if (response.ok) {
      await loadAdminData();
      setMessage("Produto excluído.");
    }
  }

  async function updateOrderStatus(order: Order, status: Order["status"]) {
    const response = await fetch(`${apiUrl}/orders/${order._id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeader()
      },
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      await loadAdminData();
      setMessage("Status do pedido atualizado.");
    }
  }

  return (
    <main className="app-shell min-h-screen text-[#230c11]">
      <header className="glass-nav">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
          <a className="flex items-center gap-3" href="/">
            <img src="/logo-ray.png" alt="Ray Fragrâncias" className="h-14 w-14 rounded-2xl border border-[#eadac8] object-cover shadow-sm" />
            <span>
              <span className="block font-serif text-2xl tracking-[0.16em] text-[#65111d]">RAY</span>
              <span className="block text-xs uppercase tracking-[0.28em] text-[#7b4c43]">Painel do dono</span>
            </span>
          </a>
          <a className="btn-secondary" href="/">Voltar para loja</a>
        </div>
      </header>

      {!checkingUser && user?.role !== "admin" ? (
        <section className="mx-auto max-w-3xl px-5 py-8">
          <div className="surface rounded-[30px] p-6">
            <p className="eyebrow">Acesso restrito</p>
            <h1 className="mt-2 font-serif text-4xl text-[#65111d]">Entre como dono para acessar o admin</h1>
            <p className="mt-3 text-sm leading-6 text-[#6b403b]">
              A primeira conta criada no sistema vira admin automaticamente. Depois, o acesso à operação da loja fica protegido.
            </p>
            <a className="btn-primary mt-5" href="/conta">Entrar ou criar conta</a>
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-7xl px-5 py-8">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="eyebrow">Operação</p>
              <h1 className="mt-2 font-serif text-5xl text-[#65111d]">Painel da loja</h1>
              <p className="mt-2 text-sm text-[#6b403b]">{message}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ["overview", "Visão geral"],
                ["products", "Produtos"],
                ["orders", "Pedidos"]
              ].map(([id, label]) => (
                <button
                  className={tab === id ? "btn-primary" : "btn-secondary"}
                  key={id}
                  onClick={() => setTab(id as typeof tab)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {tab === "overview" && (
            <div className="grid gap-4 md:grid-cols-4">
              <MetricCard label="Produtos ativos" value={String(products.filter((product) => product.isActive).length)} hint={`${products.length} no total`} />
              <MetricCard label="Pedidos em aberto" value={String(pendingOrders.length)} hint="pendentes ou pagos" />
              <MetricCard label="Faturamento" value={money.format(monthlyRevenue)} hint="pedidos pagos" />
              <MetricCard label="Estoque baixo" value={String(lowStockProducts.length)} hint="3 unidades ou menos" />
              <div className="surface rounded-[28px] p-5 md:col-span-2">
                <p className="font-semibold text-[#65111d]">Atenção de estoque</p>
                <div className="mt-4 space-y-3">
                  {lowStockProducts.length === 0 ? (
                    <p className="text-sm text-[#6b403b]">Nenhum produto em estoque baixo.</p>
                  ) : (
                    lowStockProducts.map((product) => (
                      <div className="flex items-center justify-between rounded-2xl bg-[#fffaf5] p-3" key={product._id}>
                        <span className="text-sm font-semibold text-[#65111d]">{product.name}</span>
                        <span className="text-sm text-[#6b403b]">{product.stock} un.</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="surface rounded-[28px] p-5 md:col-span-2">
                <p className="font-semibold text-[#65111d]">Pedidos recentes</p>
                <div className="mt-4 space-y-3">
                  {orders.slice(0, 4).map((order) => (
                    <div className="rounded-2xl bg-[#fffaf5] p-3" key={order._id}>
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="font-semibold text-[#65111d]">{order.customer.name}</span>
                        <span>{money.format(order.total)}</span>
                      </div>
                      <p className="mt-1 text-xs text-[#6b403b]">{statusLabel(order.status)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "products" && (
            <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
              <ProductForm
                editingProduct={editingProduct}
                onCancel={() => setEditingProduct(null)}
                onPhotoName={setPhotoName}
                photoName={photoName}
                onSubmit={submitProduct}
              />
              <div className="surface rounded-[32px] p-5">
                <p className="font-semibold text-[#65111d]">Produtos cadastrados</p>
                <div className="mt-4 space-y-3">
                  {products.map((product) => (
                    <div className="grid gap-3 rounded-2xl border border-[#eadac8] bg-[#fffaf5] p-4 md:grid-cols-[1fr_auto]" key={product._id}>
                      <div>
                        <p className="font-semibold text-[#65111d]">{product.name}</p>
                        <p className="mt-1 text-sm text-[#6b403b]">{money.format(product.price)} · {product.stock} un. · {product.isActive ? "ativo" : "pausado"}</p>
                        <p className="mt-1 text-xs text-[#9a6b58]">{product.family} · {product.size}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button className="btn-secondary min-h-10 px-4 py-2 text-xs" onClick={() => setEditingProduct(product)} type="button">Editar</button>
                        <button className="btn-secondary min-h-10 px-4 py-2 text-xs" onClick={() => toggleProduct(product)} type="button">{product.isActive ? "Pausar" : "Ativar"}</button>
                        <button className="btn-secondary min-h-10 px-4 py-2 text-xs" onClick={() => deleteProduct(product)} type="button">Excluir</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "orders" && (
            <div className="surface rounded-[32px] p-5">
              <p className="font-semibold text-[#65111d]">Pedidos</p>
              <div className="mt-4 space-y-3">
                {orders.length === 0 ? (
                  <p className="text-sm text-[#6b403b]">Nenhum pedido criado ainda.</p>
                ) : (
                  orders.map((order) => (
                    <div className="grid gap-4 rounded-2xl border border-[#eadac8] bg-[#fffaf5] p-4 lg:grid-cols-[1fr_220px]" key={order._id}>
                      <div>
                        <div className="flex flex-wrap justify-between gap-2">
                          <p className="font-semibold text-[#65111d]">{order.customer.name}</p>
                          <p className="font-semibold">{money.format(order.total)}</p>
                        </div>
                        <p className="mt-1 text-sm text-[#6b403b]">{order.customer.email} · CEP {order.customer.cep}</p>
                        <p className="mt-2 text-sm text-[#6b403b]">
                          {order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}
                        </p>
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#9a6b58]">{statusLabel(order.status)}</p>
                      </div>
                      <select className="field" value={order.status} onChange={(event) => updateOrderStatus(order, event.target.value as Order["status"])}>
                        {orderStatuses.map((status) => (
                          <option key={status} value={status}>{statusLabel(status)}</option>
                        ))}
                      </select>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function ProductForm({
  editingProduct,
  onCancel,
  onPhotoName,
  photoName,
  onSubmit
}: {
  editingProduct: Product | null;
  onCancel: () => void;
  onPhotoName: (name: string) => void;
  photoName: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="surface rounded-[32px] p-6" key={editingProduct?._id || "new-product"} onSubmit={onSubmit}>
      <p className="eyebrow">Produtos</p>
      <h2 className="mt-2 font-serif text-4xl text-[#65111d]">
        {editingProduct ? "Editar perfume" : "Adicionar perfume"}
      </h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <input className="field" defaultValue={editingProduct?.name} name="name" placeholder="Nome do perfume" required />
        <input className="field" defaultValue={editingProduct?.price} name="price" placeholder="Preço" required step="0.01" type="number" />
        <input className="field" defaultValue={editingProduct?.family} name="family" placeholder="Família olfativa" required />
        <input className="field" defaultValue={editingProduct?.stock} name="stock" placeholder="Estoque" required type="number" />
        <input className="field" defaultValue={editingProduct?.size} name="size" placeholder="Volume, ex: 100 ml" required />
        <input className="field" defaultValue={editingProduct?.tag} name="tag" placeholder="Selo, ex: Lançamento" />
        <input name="isActive" type="hidden" value={editingProduct?.isActive === false ? "false" : "true"} />
        <label className="sm:col-span-2">
          <span className="mb-2 block text-sm font-semibold text-[#65111d]">Foto do perfume</span>
          <span className="grid min-h-40 place-items-center rounded-[24px] border border-dashed border-[#cda58f] bg-[#fffaf5] px-5 py-6 text-center">
            <span>
              <span className="block font-semibold text-[#65111d]">{photoName || "Clique para carregar a foto"}</span>
              <span className="mt-1 block text-sm text-[#6b403b]">PNG, JPG ou WEBP até 5 MB</span>
            </span>
            <input
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              name="image"
              onChange={(event) => onPhotoName(event.target.files?.[0]?.name ?? "")}
              type="file"
            />
          </span>
        </label>
        <textarea className="field min-h-28 sm:col-span-2" defaultValue={editingProduct?.notes} name="notes" placeholder="Descrição e notas olfativas" required />
        <button className="btn-primary sm:col-span-2" type="submit">{editingProduct ? "Salvar alterações" : "Salvar produto"}</button>
        {editingProduct && (
          <button className="btn-secondary sm:col-span-2" onClick={onCancel} type="button">Cancelar edição</button>
        )}
      </div>
    </form>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="soft-card rounded-[24px] p-5">
      <p className="text-sm text-[#9a6b58]">{label}</p>
      <strong className="mt-1 block text-3xl text-[#65111d]">{value}</strong>
      <p className="mt-2 text-sm text-[#6b403b]">{hint}</p>
    </div>
  );
}

function statusLabel(status: Order["status"]) {
  const labels = {
    pending: "Pendente",
    paid: "Pago",
    shipping: "Enviado",
    delivered: "Entregue",
    cancelled: "Cancelado"
  };

  return labels[status];
}

function authHeader() {
  const token = window.localStorage.getItem("ray_token");

  return token ? { Authorization: `Bearer ${token}` } : {};
}
