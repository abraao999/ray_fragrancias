"use client";

import { FormEvent, useEffect, useState } from "react";

type User = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "customer" | "admin";
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("Entre para acompanhar pedidos e preencher o checkout mais rápido.");

  useEffect(() => {
    const token = window.localStorage.getItem("ray_token");

    if (!token) {
      return;
    }

    fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setUser(data.user))
      .catch(() => window.localStorage.removeItem("ray_token"));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const payload = {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      password: String(formData.get("password") || "")
    };

    const response = await fetch(`${apiUrl}/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Não foi possível entrar.");
      return;
    }

    window.localStorage.setItem("ray_token", data.token);
    setUser(data.user);
    setMessage(data.user.role === "admin" ? "Você entrou como dono." : "Você entrou como cliente.");
  }

  function logout() {
    window.localStorage.removeItem("ray_token");
    setUser(null);
    setMessage("Sessão encerrada.");
  }

  return (
    <main className="app-shell min-h-screen text-[#230c11]">
      <header className="glass-nav">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
          <a className="flex items-center gap-3" href="/">
            <img src="/logo-ray.png" alt="Ray Fragrâncias" className="h-14 w-14 rounded-2xl border border-[#eadac8] object-cover shadow-sm" />
            <span>
              <span className="block font-serif text-2xl tracking-[0.16em] text-[#65111d]">RAY</span>
              <span className="block text-xs uppercase tracking-[0.28em] text-[#7b4c43]">Minha conta</span>
            </span>
          </a>
          <a className="btn-secondary" href="/">
            Voltar para loja
          </a>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-8 px-5 py-8 md:grid-cols-[1fr_0.9fr]">
        <div className="surface rounded-[32px] p-6">
          <p className="eyebrow">Conta</p>
          <h1 className="mt-2 font-serif text-4xl text-[#65111d]">
            {user ? `Olá, ${user.name}` : mode === "login" ? "Entrar" : "Criar conta"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#6b403b]">{message}</p>

          {user ? (
            <div className="mt-6 space-y-3">
              <p className="soft-card rounded-2xl p-4 text-sm text-[#6b403b]">
                {user.email} · {user.role === "admin" ? "Dono" : "Cliente"}
              </p>
              {user.role === "admin" && (
                <a className="btn-primary" href="/admin">
                  Abrir admin
                </a>
              )}
              <button className="btn-secondary block" onClick={logout} type="button">
                Sair
              </button>
            </div>
          ) : (
            <form className="mt-6 space-y-3" onSubmit={submit}>
              {mode === "register" && (
                <>
                  <input className="field" name="name" placeholder="Nome" required />
                  <input className="field" name="phone" placeholder="Telefone" />
                </>
              )}
              <input className="field" name="email" placeholder="E-mail" required type="email" />
              <input className="field" name="password" placeholder="Senha" required type="password" />
              <button className="btn-primary" type="submit">
                {mode === "login" ? "Entrar" : "Cadastrar"}
              </button>
              <button className="btn-secondary ml-3" onClick={() => setMode(mode === "login" ? "register" : "login")} type="button">
                {mode === "login" ? "Criar conta" : "Já tenho conta"}
              </button>
            </form>
          )}
        </div>

        <aside className="soft-card rounded-[28px] p-6">
          <p className="font-semibold text-[#65111d]">Como funciona</p>
          <p className="mt-3 text-sm leading-6 text-[#6b403b]">
            A primeira conta criada no sistema vira dono/admin automaticamente. Depois disso, novas contas entram como clientes.
          </p>
          <p className="mt-3 text-sm leading-6 text-[#6b403b]">
            O admin pode acessar `/admin`; clientes ficam vinculados aos pedidos criados no checkout.
          </p>
        </aside>
      </section>
    </main>
  );
}
