import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Visa Photo Crop",
  description: "Crop your visa photo to the exact official size — free, private, no sign-up.",
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