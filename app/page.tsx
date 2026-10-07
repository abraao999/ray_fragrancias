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
  isActive: boolean;
};

type CartItem = Product & { quantity: number };
type Screen = "Vitrine" | "Catálogo" | "Produto" | "Carrinho" | "Pagamento";
type ShippingOption = {
  id: string;
  service: string;
  company: string;
  price: number;
  deliveryDays: number;
};
type CheckoutPayload = {
  customer: {
    name: string;
    email: string;
    phone: string;
    cep: string;
  };
  address: {
    cep: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  customerNote: string;
  shippingOption?: ShippingOption;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "development" ? "http://localhost:4000/api" : "/api");

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

async function readJson(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("Vitrine");
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [selected, setSelected] = useState<Product>(fallbackProducts[0]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [shipping, setShipping] = useState(18.4);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [notice, setNotice] = useState("Loja online: escolha seus perfumes, calcule o frete e finalize pelo Mercado Pago.");

  useEffect(() => {
    fetch(`${apiUrl}/products`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: Product[]) => {
        if (data.length > 0) {
          setProducts(data);
          setSelected(data[0]);
          setNotice("Produtos carregados do MongoDB.");
          return;
        }

        setNotice("API conectada. Cadastre produtos no painel do dono para substituir a vitrine demonstrativa.");
      })
      .catch(() => {
        setNotice("Vitrine demonstrativa ativa. Verifique as variáveis da API na Vercel para carregar produtos reais.");
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
    try {
      const response = await fetch(`${apiUrl}/shipping/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cep,
          subtotal,
          items: cart.map((item) => ({
            productId: item._id,
            quantity: item.quantity,
            price: item.price
          }))
        })
      });
      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data.message || "Não foi possível calcular o frete.");
      }

      const options = data.options || [];
      const firstOption = options[0];

      setShippingOptions(options);

      if (firstOption) {
        setSelectedShipping(firstOption);
        setShipping(firstOption.price);
        const sourceNotice = data.provider === "fallback"
          ? " Frete estimado usado enquanto a integração da transportadora não retorna cotação."
          : "";
        setNotice(`Frete calculado: ${firstOption.company} ${firstOption.service} por ${money.format(firstOption.price)}.${sourceNotice}`);
        return;
      }

      setSelectedShipping(null);
      setShipping(0);
      setNotice("Não encontramos opção de frete para esse CEP. Confira o CEP ou tente novamente.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível calcular o frete.");
    }
  }

  async function checkout(checkoutData: CheckoutPayload) {
    if (cart.length === 0) {
      setNotice("Adicione um perfume ao carrinho antes de finalizar o pedido.");
      return;
    }

    const response = await fetch(`${apiUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader()
      },
      body: JSON.stringify({
        ...checkoutData,
        shipping,
        shippingOption: selectedShipping,
        items: cart.map((item) => ({ productId: item._id, quantity: item.quantity }))
      })
    });
    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(data.message || "Não foi possível finalizar o pedido.");
    }

    setCart([]);
    setShippingOptions([]);
    setSelectedShipping(null);
    setShipping(18.4);
    setScreen("Vitrine");
    setNotice(`Pedido ${data.order?._id ? `#${String(data.order._id).slice(-6).toUpperCase()} ` : ""}recebido. Entraremos em contato para combinar o pagamento.`);
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

      <section className="mx-auto max-w-7xl px-5 py-6 md:py-10">
        <div className="mb-5 flex flex-col gap-3 rounded-[28px] border border-[#eadac8] bg-white/70 px-5 py-4 shadow-[0_18px_55px_rgba(101,17,29,0.06)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow">Ray Fragrâncias</p>
            <h1 className="font-serif text-3xl text-[#65111d] md:text-4xl">{screen}</h1>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-[#6b403b]">{notice}</p>
        </div>

        <div className="content-panel overflow-hidden rounded-[34px]">
          <div className="p-4 md:p-7">
            {screen === "Vitrine" && <Storefront products={products} onGo={setScreen} onSelect={setSelected} />}
            {screen === "Catálogo" && <Catalog products={products} onGo={setScreen} onSelect={setSelected} />}
            {screen === "Produto" && <ProductDetail product={selected} onAdd={addToCart} onQuote={quoteShipping} />}
            {screen === "Carrinho" && (
              <Cart
                cart={cart}
                subtotal={subtotal}
                shipping={shipping}
                shippingOptions={shippingOptions}
                selectedShipping={selectedShipping}
                total={total}
                onGo={setScreen}
                onQuote={quoteShipping}
                onSelectShipping={(option) => {
                  setSelectedShipping(option);
                  setShipping(option.price);
                }}
              />
            )}
            {screen === "Pagamento" && <Payment cart={cart} subtotal={subtotal} shipping={shipping} total={total} onCheckout={checkout} setNotice={setNotice} />}
          </div>
        </div>
      </section>
    </main>
  );
}

function authHeader(): Record<string, string> {
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
  const [search, setSearch] = useState("");
  const [family, setFamily] = useState("todas");
  const [sort, setSort] = useState("relevancia");

  const families = useMemo(
    () => Array.from(new Set(products.map((product) => product.family).filter(Boolean))).sort(),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products
      .filter((product) => {
        const matchesFamily = family === "todas" || product.family === family;
        const searchableText = `${product.name} ${product.family} ${product.notes} ${product.tag}`.toLowerCase();
        const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);

        return matchesFamily && matchesSearch;
      })
      .sort((a, b) => {
        if (sort === "menor-preco") {
          return a.price - b.price;
        }

        if (sort === "maior-preco") {
          return b.price - a.price;
        }

        if (sort === "estoque") {
          return b.stock - a.stock;
        }

        return Number(b.tag === "Mais vendido") - Number(a.tag === "Mais vendido");
      });
  }, [family, products, search, sort]);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-[#eadac8] bg-gradient-to-br from-white to-[#fff7ef] p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Catálogo</p>
            <h3 className="mt-1 font-serif text-4xl text-[#65111d]">Escolha por aroma, preço ou ocasião</h3>
            <p className="mt-2 text-sm text-[#6b403b]">{filteredProducts.length} perfume{filteredProducts.length === 1 ? "" : "s"} encontrado{filteredProducts.length === 1 ? "" : "s"}.</p>
          </div>
          {(search || family !== "todas" || sort !== "relevancia") && (
            <button className="btn-secondary" onClick={() => { setSearch(""); setFamily("todas"); setSort("relevancia"); }} type="button">
              Limpar filtros
            </button>
          )}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_190px]">
          <input className="field" onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, nota ou família" value={search} />
          <select className="field" onChange={(event) => setFamily(event.target.value)} value={family}>
            <option value="todas">Todas as famílias</option>
            {families.map((familyName) => (
              <option key={familyName} value={familyName}>{familyName}</option>
            ))}
        </select>
          <select className="field" onChange={(event) => setSort(event.target.value)} value={sort}>
          <option value="relevancia">Relevância</option>
            <option value="menor-preco">Menor preço</option>
            <option value="maior-preco">Maior preço</option>
            <option value="estoque">Maior estoque</option>
        </select>
        </div>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
          <PerfumeCard key={product._id} product={product} onSelect={onSelect} onGo={onGo} />
        ))}
        </div>
      ) : (
        <div className="rounded-[28px] border border-dashed border-[#d6ad96] bg-white/70 p-8 text-center">
          <p className="font-serif text-3xl text-[#65111d]">Nenhum perfume encontrado</p>
          <p className="mt-2 text-sm text-[#6b403b]">Tente buscar por outra nota, família olfativa ou limpar os filtros.</p>
        </div>
      )}
    </div>
  );
}

function ProductDetail({ product, onAdd, onQuote }: { product: Product; onAdd: (product: Product) => void; onQuote: (cep: string) => Promise<void> }) {
  const [cep, setCep] = useState("");
  const stockLabel = product.stock <= 0 ? "Esgotado" : product.stock <= 3 ? `Só ${product.stock} em estoque` : "Disponível";

  return (
    <div className="product-hero overflow-hidden rounded-[32px]">
      <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative min-h-[420px] bg-[#f3e4d5] p-4 md:p-8">
          <div className="absolute left-6 top-6 z-10 flex gap-2">
            <span className="rounded-full bg-white/85 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#65111d] shadow-sm">{product.tag}</span>
            <span className="rounded-full bg-[#65111d] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-sm">{stockLabel}</span>
          </div>
          <ProductImage product={product} large />
        </div>

        <div className="flex flex-col justify-center bg-[#fffaf5] p-6 md:p-10 xl:p-14">
          <p className="eyebrow">{product.family}</p>
          <h3 className="mt-3 max-w-xl font-serif text-5xl leading-[0.95] text-[#65111d] md:text-7xl">{product.name}</h3>
          <p className="mt-6 max-w-lg text-lg leading-8 text-[#6b403b]">
            Notas de {product.notes}. Fragrância selecionada para marcar presença com sofisticação no dia a dia.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#eadac8] bg-white/70 p-4">
              <span className="block text-xs uppercase tracking-[0.16em] text-[#9a6b58]">Tamanho</span>
              <strong className="mt-1 block text-[#230c11]">{product.size}</strong>
            </div>
            <div className="rounded-2xl border border-[#eadac8] bg-white/70 p-4">
              <span className="block text-xs uppercase tracking-[0.16em] text-[#9a6b58]">Estoque</span>
              <strong className="mt-1 block text-[#230c11]">{product.stock} un.</strong>
            </div>
            <div className="rounded-2xl border border-[#eadac8] bg-white/70 p-4">
              <span className="block text-xs uppercase tracking-[0.16em] text-[#9a6b58]">Entrega</span>
              <strong className="mt-1 block text-[#230c11]">Por CEP</strong>
            </div>
          </div>

          <div className="mt-7 rounded-[24px] border border-[#eadac8] bg-white/80 p-4">
            <p className="text-sm font-bold text-[#65111d]">Calcular entrega</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_150px]">
              <input className="field" placeholder="Digite seu CEP" value={cep} onChange={(event) => setCep(event.target.value)} />
              <button className="btn-primary bg-[#230c11]" onClick={() => onQuote(cep)} type="button">Calcular</button>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div>
              <span className="text-sm text-[#9a6b58]">Preço</span>
              <strong className="block text-4xl text-[#65111d]">{money.format(product.price)}</strong>
            </div>
            <button className="btn-primary min-w-56" disabled={product.stock <= 0} onClick={() => onAdd(product)} type="button">
              {product.stock <= 0 ? "Indisponível" : "Adicionar ao carrinho"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Cart({
  cart,
  subtotal,
  shipping,
  shippingOptions,
  selectedShipping,
  total,
  onGo,
  onQuote,
  onSelectShipping
}: {
  cart: CartItem[];
  subtotal: number;
  shipping: number;
  shippingOptions: ShippingOption[];
  selectedShipping: ShippingOption | null;
  total: number;
  onGo: (screen: Screen) => void;
  onQuote: (cep: string) => Promise<void>;
  onSelectShipping: (option: ShippingOption) => void;
}) {
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
          {shippingOptions.length > 0 && (
            <div className="mt-4 space-y-2">
              {shippingOptions.map((option) => (
                <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-[#eadac8] bg-white/70 p-3 text-sm" key={option.id}>
                  <span>
                    <span className="block font-semibold text-[#65111d]">{option.company} · {option.service}</span>
                    <span className="text-[#6b403b]">{option.deliveryDays || "?"} dias úteis</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <strong>{money.format(option.price)}</strong>
                    <input checked={selectedShipping?.id === option.id} onChange={() => onSelectShipping(option)} type="radio" />
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      <OrderSummary subtotal={subtotal} shipping={shipping} total={total} action="Ir para pagamento" onClick={() => onGo("Pagamento")} />
    </div>
  );
}

function Payment({ cart, subtotal, shipping, total, onCheckout, setNotice }: { cart: CartItem[]; subtotal: number; shipping: number; total: number; onCheckout: (payload: CheckoutPayload) => Promise<void>; setNotice: (notice: string) => void }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const cep = String(formData.get("cep") || "");

    try {
      await onCheckout({
        customer: {
          name: String(formData.get("name") || ""),
          email: String(formData.get("email") || ""),
          phone: String(formData.get("phone") || ""),
          cep
        },
        address: {
          cep,
          street: String(formData.get("street") || ""),
          number: String(formData.get("number") || ""),
          complement: String(formData.get("complement") || ""),
          neighborhood: String(formData.get("neighborhood") || ""),
          city: String(formData.get("city") || ""),
          state: String(formData.get("state") || "")
        },
        customerNote: String(formData.get("customerNote") || "")
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Erro ao finalizar pedido.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <form className="space-y-4" onSubmit={submit}>
        <div className="soft-card rounded-[24px] p-4">
          <p className="font-semibold text-[#65111d]">Dados do cliente</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input className="field" name="name" placeholder="Nome completo" required />
            <input className="field" name="email" placeholder="E-mail" required type="email" />
            <input className="field md:col-span-2" name="phone" placeholder="Telefone / WhatsApp" />
          </div>
        </div>
        <div className="soft-card rounded-[24px] p-4">
          <p className="font-semibold text-[#65111d]">Endereço de entrega</p>
          <div className="mt-3 grid gap-3 md:grid-cols-6">
            <input className="field md:col-span-2" name="cep" placeholder="CEP" required />
            <input className="field md:col-span-4" name="street" placeholder="Rua / Avenida" required />
            <input className="field md:col-span-2" name="number" placeholder="Número" required />
            <input className="field md:col-span-4" name="complement" placeholder="Complemento" />
            <input className="field md:col-span-2" name="neighborhood" placeholder="Bairro" required />
            <input className="field md:col-span-3" name="city" placeholder="Cidade" required />
            <input className="field md:col-span-1" name="state" placeholder="UF" required maxLength={2} />
          </div>
        </div>
        <textarea className="field min-h-24" name="customerNote" placeholder="Observação para o pedido, ex: embalagem para presente" />
        <button className="btn-primary" disabled={cart.length === 0} type="submit">
          Finalizar pedido
        </button>
      </form>
      <OrderSummary subtotal={subtotal} shipping={shipping} total={total} action="Finalizar compra" />
    </div>
  );
}

function PerfumeCard({ product, onSelect, onGo }: { product: Product; onSelect: (product: Product) => void; onGo: (screen: Screen) => void }) {
  const stockLabel = product.stock <= 0 ? "Esgotado" : product.stock <= 3 ? "Últimas unidades" : `Estoque ${product.stock}`;

  return (
    <article className="group overflow-hidden rounded-[28px] border border-[#eadac8] bg-[#fffaf5] p-3 shadow-[0_18px_55px_rgba(101,17,29,0.08)] transition hover:-translate-y-1 hover:shadow-2xl">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="rounded-full bg-[#eadac8] px-3 py-1 text-xs font-semibold text-[#65111d]">{product.tag}</span>
        <span className={`text-xs font-semibold ${product.stock <= 3 ? "text-[#9a2432]" : "text-[#6b403b]"}`}>{stockLabel}</span>
      </div>
      <ProductImage product={product} />
      <div className="p-2">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a6b58]">{product.family}</p>
        <h3 className="mt-1 font-serif text-2xl text-[#65111d]">{product.name}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6b403b]">{product.notes}</p>
      </div>
      <div className="flex items-center justify-between gap-3 p-2 pt-1">
        <strong className="text-xl text-[#230c11]">{money.format(product.price)}</strong>
        <button className="btn-primary min-h-10 px-4 py-2 text-sm" disabled={product.stock <= 0} onClick={() => { onSelect(product); onGo("Produto"); }} type="button">
          {product.stock <= 0 ? "Indisponível" : "Ver detalhes"}
        </button>
      </div>
    </article>
  );
}

function ProductImage({ product, large = false }: { product: Product; large?: boolean }) {
  const image = resolveImageUrl(product.imageUrl);

  return (
    <div className={`${large ? "min-h-[520px] rounded-[30px]" : "mb-4 h-64 rounded-[24px]"} grid place-items-center overflow-hidden bg-gradient-to-br from-[#fff8f0] via-[#f0ddc9] to-[#d8b18f]`}>
      {image ? (
        <img src={image} alt={product.name} className={`${large ? "h-full max-h-[470px]" : "h-full w-full"} max-w-full rounded object-cover transition duration-300 group-hover:scale-[1.03]`} />
      ) : (
        <div className={`${large ? "h-72 w-36 rounded-t-[42px]" : "h-28 w-16 rounded-t-3xl"} border border-[#d6ad96] bg-gradient-to-b from-white to-[#eadac8] shadow-xl`} />
      )}
    </div>
  );
}

function resolveImageUrl(imageUrl?: string) {
  if (!imageUrl) {
    return "";
  }

  if (imageUrl.startsWith("data:") || imageUrl.startsWith("http")) {
    return imageUrl;
  }

  return `${apiUrl.replace(/\/api$/, "")}${imageUrl}`;
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
