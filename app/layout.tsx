import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MobileConnectOS | Retail workspace",
  description: "Sales, inventory and team operations in one workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
