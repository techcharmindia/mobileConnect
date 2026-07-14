import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sales Entry | Telstra Sales Portal",
  description: "Create and manage new sales entries.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
