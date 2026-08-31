import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Layaa Client Calendar",
  description: "A clear, private view of your content calendar.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
