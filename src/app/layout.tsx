import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const asciiFont = localFont({
  src: "./fonts/RobotoMono-Regular.woff2",
  variable: "--font-ascii",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://leandromesq.github.io",
  ),
  title: { default: "Lugar Nenhum", template: "%s | Lugar Nenhum" },
  description: "músicas vindas de lugar nenhum, indo pra lugar algum",
  openGraph: {
    title: "Lugar Nenhum",
    description: "músicas vindas de lugar nenhum, indo pra lugar algum",
    locale: "pt_BR",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={asciiFont.variable}>
      <body>{children}</body>
    </html>
  );
}
