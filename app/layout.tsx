import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import MobileAccessGuard from "@/components/MobileAccessGuard";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Operations Control",
  description: "Enterprise Project & Task Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Force light mode by default - IGNORE system preferences
                var theme = localStorage.getItem('theme');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                  localStorage.setItem('theme', 'light');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} antialiased bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-300`}>
        <MobileAccessGuard>{children}</MobileAccessGuard>
      </body>
    </html>
  );
}
