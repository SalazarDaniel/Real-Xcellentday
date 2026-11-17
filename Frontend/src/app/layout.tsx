import type { Metadata } from "next";
import { Inter, Playfair_Display, Poppins } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const inter = Inter({
  variable: "--font-inter-face",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Xcellent Day", template: "%s · Xcellent Day" },
  description: "La plataforma todo-en-uno para wedding planners.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${playfair.variable} ${poppins.variable} ${inter.variable} h-full`}>
      <body className="min-h-full">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
