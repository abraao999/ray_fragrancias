"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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
};

type CartItem = Product & { quantity: number };
type Screen = "Vitrine" | "Catálogo" | "Produto" | "Carrinho" | "Pagamento";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const fallbackProducts: Product[] = [
  {
    _id: "demo-ray-signature",
    name: "Ray Signature",
    family: "Amadeirado floral",
    size: "100 ml",
    price: 189.9,
    notes: "bergamota, jasmim e âmbar",
    stock: 14,
    tag: "Mais vendido",
    isActive: true
  },
  {
    _id: "demo-noite-rubi",
    name: "Noite Rubi",
    family: "Oriental intenso",
    size: "80 ml",
    price: 219.9,
    notes: "ameixa, baunilha e patchouli",
    stock: 7,
    tag: "Presente",
    isActive: true
  },
  {
    _id: "demo-aura-linho",
    name: "Aura de Linho",
    family: "Cítrico fresco",
    size: "60 ml",
    price: 149.9,
    notes: "limão siciliano, chá branco e musk",
    stock: 22,
    tag: "Dia a dia",
    isActive: true
  }
];

const nav: Screen[] = ["Vitrine", "Catálogo", "Produto", "Carrinho", "Pagamento"];

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

export default function Home() {
  const [screen, setScreen] = useState<Screen>("Vitrine");
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [selected, setSelected] = useState<Product>(fallbackProducts[0]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [shipping, setShipping] = useState(18.4);
  const [notice, setNotice] = useState("Conecte a API para salvar produtos, calcular frete e pagar pelo Mercado Pago.");

  useEffect(() => {
    fetch(`${apiUrl}/products`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: Product[]) => {
        if (data.length > 0) {
          setProducts(data);
          setSelected(data[0]);
          setNotice("Produtos carregados do MongoDB.");
        }
      })
      .catch(() => {
        setNotice("Modo demonstração: ligue a API Node para usar MongoDB e Mercado Pago.");
      });
  }, []);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );
  const total = subtotal + shipping;

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find((item) => item._id === product._id);

      if (existing) {
        return current.map((item) =>
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [...current, { ...product, quantity: 1 }];
    });
    setScreen("Carrinho");
  }

  async function quoteShipping(cep: string) {
    const response = await fetch(`${apiUrl}/shipping/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cep, subtotal })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Não foi possível calcular o frete.");
    }

    setShipping(data.price);
    setNotice(`Frete calculado: ${money.format(data.price)} em ${data.deliveryDays} dias úteis.`);
  }

  async function checkout(customer: { name: string; email: string; phone: string; cep: string }) {
    if (cart.length === 0) {
      setNotice("Adicione um perfume ao carrinho antes de pagar.");
      return;
    }

    const response = await fetch(`${apiUrl}/payments/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader()
      },
      body: JSON.stringify({
        customer,
        shipping,
        items: cart.map((item) => ({ productId: item._id, quantity: item.quantity }))
      })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Não foi possível iniciar o pagamento.");
    }

    window.location.href = data.paymentUrl;
  }

  return (
    <main className="app-shell min-h-screen text-[#230c11]">
      <header className="glass-nav sticky top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
          <button className="flex items-center gap-3 text-left" onClick={() => setScreen("Vitrine")} type="button">
            <img src="/logo-ray.png" alt="Ray Fragrâncias" className="h-14 w-14 rounded-2xl border border-[#eadac8] object-cover shadow-sm" />
            <span>
              <span className="block font-serif text-2xl tracking-[0.16em] text-[#65111d]">RAY</span>
              <span className="block text-xs uppercase tracking-[0.28em] text-[#7b4c43]">Fragrâncias</span>
            </span>
          </button>
          <nav className="hidden items-center gap-2 lg:flex" aria-label="Telas">
            {nav.map((item) => (
              <button
                key={item}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${screen === item ? "bg-[#65111d] text-white shadow-sm" : "text-[#6b403b] hover:bg-[#efe0d2]"}`}
                onClick={() => setScreen(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </nav>
          <button className="btn-primary" onClick={() => setScreen("Carrinho")} type="button">
            Carrinho · {cart.reduce((sum, item) => sum + item.quantity, 0)}
          </button>
          <a className="btn-secondary hidden md:inline-flex" href="/conta">
            Minha conta
          </a>
          <a className="btn-secondary hidden sm:inline-flex" href="/admin">
            Admin
          </a>
        </div>
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 pb-3 lg:hidden">
          {nav.map((item) => (
            <button key={item} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${screen === item ? "bg-[#65111d] text-white" : "bg-[#efe0d2]"}`} onClick={() => setScreen(item)} type="button">
              {item}
            </button>
          ))}
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <div className="surface rounded-[28px] p-5">
            <p className="eyebrow">Loja implementada</p>
            <h1 className="mt-2 font-serif text-4xl leading-tight text-[#65111d]">Ray Fragrâncias</h1>
            <p className="mt-3 text-sm leading-6 text-[#6b403b]">
              React Web consumindo API Node, MongoDB para produtos e Mercado Pago para checkout.
            </p>
          </div>
          <div className="soft-card rounded-[24px] p-5">
            <p className="text-sm font-semibold text-[#65111d]">Status</p>
            <p className="mt-2 text-sm leading-6 text-[#6b403b]">{notice}</p>
          </div>
        </aside>

        <div className="surface overflow-hidden rounded-[32px]">
          <div className="border-b border-[#eadac8] px-6 py-5">
            <p className="eyebrow">Tela atual</p>
            <h2 className="font-serif text-4xl text-[#65111d]">{screen}</h2>
          </div>
          <div className="p-5 md:p-8">
            {screen === "Vitrine" && <Storefront products={products} onGo={setScreen} onSelect={setSelected} />}
            {screen === "Catálogo" && <Catalog products={products} onGo={setScreen} onSelect={setSelected} />}
            {screen === "Produto" && <ProductDetail product={selected} onAdd={addToCart} onQuote={quoteShipping} />}
            {screen === "Carrinho" && <Cart cart={cart} subtotal={subtotal} shipping={shipping} total={total} onGo={setScreen} onQuote={quoteShipping} />}
            {screen === "Pagamento" && <Payment cart={cart} subtotal={subtotal} shipping={shipping} total={total} onCheckout={checkout} setNotice={setNotice} />}
          </div>
        </div>
      </section>
    </main>
  );
}

function authHeader() {
  if (typeof window === "undefined") {
    return {};
  }

  const token = window.localStorage.getItem("ray_token");

  return token ? { Authorization: `Bearer ${token}` } : {};
}

function Storefront({ products, onGo, onSelect }: { products: Product[]; onGo: (screen: Screen) => void; onSelect: (product: Product) => void }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="dark-panel relative overflow-hidden rounded-[30px] p-8 md:p-10">
        <p className="text-sm uppercase tracking-[0.28em] text-[#eac6a9]">Essências que marcam</p>
        <h3 className="mt-4 max-w-2xl font-serif text-5xl leading-[1.02] md:text-6xl">Perfumes com compra online e gestão do dono.</h3>
        <p className="mt-5 max-w-xl text-base leading-7 text-[#f7dfd4]">
          Vitrine, catálogo, frete por CEP, cadastro com foto e checkout Mercado Pago.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button className="btn-primary bg-white text-[#65111d]" onClick={() => onGo("Catálogo")} type="button">Ver catálogo</button>
          <a className="btn-ghost" href="/admin">Área do dono</a>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {["Pix e cartão", "Foto no produto", "Frete por CEP"].map((item) => (
            <div className="rounded-2xl border border-white/15 bg-white/8 p-3 text-sm text-[#f7dfd4]" key={item}>{item}</div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        {products.slice(0, 2).map((product) => (
          <PerfumeCard key={product._id} product={product} onSelect={onSelect} onGo={onGo} />
        ))}
      </div>
    </div>
  );
}

function Catalog({ products, onGo, onSelect }: { products: Product[]; onGo: (screen: Screen) => void; onSelect: (product: Product) => void }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[1fr_180px_160px]">
        <input className="field" placeholder="Buscar por nome, nota ou família" />
        <select className="field" defaultValue="familia">
          <option value="familia">Família olfativa</option>
          <option>Floral</option>
          <option>Amadeirado</option>
          <option>Cítrico</option>
        </select>
        <select className="field" defaultValue="relevancia">
          <option value="relevancia">Relevância</option>
          <option>Menor preço</option>
          <option>Mais vendidos</option>
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <PerfumeCard key={product._id} product={product} onSelect={onSelect} onGo={onGo} />
        ))}
      </div>
    </div>
  );
}

function ProductDetail({ product, onAdd, onQuote }: { product: Product; onAdd: (product: Product) => void; onQuote: (cep: string) => Promise<void> }) {
  const [cep, setCep] = useState("");

  return (
    <div className="grid gap-7 lg:grid-cols-[0.9fr_1.1fr]">
      <ProductImage product={product} large />
      <div>
        <p className="text-sm uppercase tracking-[0.24em] text-[#9a6b58]">{product.family}</p>
        <h3 className="mt-2 font-serif text-5xl text-[#65111d]">{product.name}</h3>
        <p className="mt-4 text-lg text-[#6b403b]">Notas de {product.notes}. Estoque atual: {product.stock} unidades.</p>
        <div className="mt-6 rounded-lg border border-[#eadac8] p-4">
          <p className="text-sm font-semibold text-[#65111d]">Calcular entrega</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_140px]">
            <input className="field" placeholder="Digite seu CEP" value={cep} onChange={(event) => setCep(event.target.value)} />
            <button className="btn-primary bg-[#230c11]" onClick={() => onQuote(cep)} type="button">Calcular</button>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <strong className="text-3xl text-[#65111d]">{money.format(product.price)}</strong>
          <button className="btn-primary" onClick={() => onAdd(product)} type="button">Adicionar ao carrinho</button>
        </div>
      </div>
    </div>
  );
}

function Cart({ cart, subtotal, shipping, total, onGo, onQuote }: { cart: CartItem[]; subtotal: number; shipping: number; total: number; onGo: (screen: Screen) => void; onQuote: (cep: string) => Promise<void> }) {
  const [cep, setCep] = useState("");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {cart.length === 0 ? <p className="rounded-lg border border-[#eadac8] p-4 text-[#6b403b]">Seu carrinho está vazio.</p> : cart.map((item) => (
          <div className="soft-card rounded-2xl p-4" key={item._id}>
            <p className="font-semibold text-[#65111d]">{item.name} · {item.size}</p>
            <p className="mt-1 text-sm text-[#6b403b]">Quantidade {item.quantity} · {money.format(item.price)}</p>
          </div>
        ))}
        <div className="soft-card rounded-2xl p-4">
          <p className="font-semibold text-[#65111d]">Entrega</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px]">
            <input className="field" placeholder="CEP do cliente" value={cep} onChange={(event) => setCep(event.target.value)} />
            <button className="btn-primary bg-[#230c11]" onClick={() => onQuote(cep)} type="button">Atualizar</button>
          </div>
        </div>
      </div>
      <OrderSummary subtotal={subtotal} shipping={shipping} total={total} action="Ir para pagamento" onClick={() => onGo("Pagamento")} />
    </div>
  );
}

function Payment({ cart, subtotal, shipping, total, onCheckout, setNotice }: { cart: CartItem[]; subtotal: number; shipping: number; total: number; onCheckout: (customer: { name: string; email: string; phone: string; cep: string }) => Promise<void>; setNotice: (notice: string) => void }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      await onCheckout({
        name: String(formData.get("name") || ""),
        email: String(formData.get("email") || ""),
        phone: String(formData.get("phone") || ""),
        cep: String(formData.get("cep") || "")
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Erro ao abrir pagamento.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <form className="space-y-3" onSubmit={submit}>
        <input className="field" name="name" placeholder="Nome do cliente" required />
        <input className="field" name="email" placeholder="E-mail" required type="email" />
        <input className="field" name="phone" placeholder="Telefone" />
        <input className="field" name="cep" placeholder="CEP" required />
        <button className="btn-primary" disabled={cart.length === 0} type="submit">
          Pagar com Mercado Pago
        </button>
      </form>
      <OrderSummary subtotal={subtotal} shipping={shipping} total={total} action="Finalizar compra" />
    </div>
  );
}

function PerfumeCard({ product, onSelect, onGo }: { product: Product; onSelect: (product: Product) => void; onGo: (screen: Screen) => void }) {
  return (
    <article className="soft-card rounded-[24px] p-4 transition hover:-translate-y-1 hover:shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded bg-[#eadac8] px-3 py-1 text-xs font-semibold text-[#65111d]">{product.tag}</span>
        <span className="text-xs text-[#6b403b]">Estoque {product.stock}</span>
      </div>
      <ProductImage product={product} />
      <p className="text-sm text-[#9a6b58]">{product.family}</p>
      <h3 className="mt-1 font-serif text-2xl text-[#65111d]">{product.name}</h3>
      <p className="mt-2 text-sm text-[#6b403b]">{product.notes}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <strong className="text-lg text-[#230c11]">{money.format(product.price)}</strong>
        <button className="btn-primary min-h-10 px-4 py-2 text-sm" onClick={() => { onSelect(product); onGo("Produto"); }} type="button">Ver</button>
      </div>
    </article>
  );
}

function ProductImage({ product, large = false }: { product: Product; large?: boolean }) {
  const image = product.imageUrl ? `${apiUrl}${product.imageUrl}` : "";

  return (
    <div className={`${large ? "min-h-96 rounded-[28px]" : "mb-4 h-44 rounded-[22px]"} grid place-items-center bg-gradient-to-br from-[#fff7ef] to-[#eadac8]`}>
      {image ? (
        <img src={image} alt={product.name} className={`${large ? "max-h-80" : "h-32"} max-w-full rounded object-contain`} />
      ) : (
        <div className={`${large ? "h-72 w-36 rounded-t-[42px]" : "h-28 w-16 rounded-t-3xl"} border border-[#d6ad96] bg-gradient-to-b from-white to-[#eadac8] shadow-xl`} />
      )}
    </div>
  );
}

function OrderSummary({ subtotal, shipping, total, action, onClick }: { subtotal: number; shipping: number; total: number; action: string; onClick?: () => void }) {
  return (
    <aside className="soft-card rounded-[24px] p-5">
      <p className="font-semibold text-[#65111d]">Resumo</p>
      <div className="mt-4 space-y-3">
        <div className="flex justify-between gap-5 text-sm"><span className="text-[#6b403b]">Subtotal</span><strong>{money.format(subtotal)}</strong></div>
        <div className="flex justify-between gap-5 text-sm"><span className="text-[#6b403b]">Frete</span><strong>{money.format(shipping)}</strong></div>
        <div className="flex justify-between gap-5 text-sm"><span className="text-[#6b403b]">Total</span><strong className="text-xl text-[#65111d]">{money.format(total)}</strong></div>
      </div>
      <button className="btn-primary mt-5 w-full" onClick={onClick} type="button">{action}</button>
    </aside>
  );
}
