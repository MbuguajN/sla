import './globals.css'
import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { ThemeProvider } from '@/components/ThemeProvider'

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "5DM Operations - SLA Management",
  description: "Enterprise SLA Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.className} antialiased text-base-content min-h-screen`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
