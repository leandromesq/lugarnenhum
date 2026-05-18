import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instrumentSerif = Instrument_Serif({ variable: "--font-instrument-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.lugarnenhum.wav"),
  title: "Lugar Nenhum",
  description: "músicas vindas de lugar nenhum, indo pra lugar algum",
  openGraph: {
    title: "Lugar Nenhum",
    description: "músicas vindas de lugar nenhum, indo pra lugar algum",
    locale: "pt_BR",
    type: "website",
    images: ["/assets/og-placeholder.svg"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
