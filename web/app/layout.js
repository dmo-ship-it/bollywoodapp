import "./globals.css";
import NavWrapper from "./components/NavWrapper";

export const metadata = {
  title: "Rasika — Discover stories you'll love.",
  description: "A film-ranking home for the curious. Indian cinema first, and open to every story worth savouring.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased" style={{ background: "var(--paper)", color: "var(--ink)" }}>
        <NavWrapper />
        <main className="pb-20 md:pb-0">{children}</main>
      </body>
    </html>
  );
}
