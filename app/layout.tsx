import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ray Fragrâncias | Loja virtual",
  description:
    "Esboço navegável da loja virtual Ray Fragrâncias com catálogo, checkout e painel do dono.",
  icons: {
    icon: "/logo-ray.png",
    shortcut: "/logo-ray.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
