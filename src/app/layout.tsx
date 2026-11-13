
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Insight | Business Intelligence Platform",
  description:
    "Transform your business data into intelligent insights and strategic decisions.",
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
