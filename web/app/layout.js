import "./globals.css";
import Header from "./components/Header";
import BottomNav from "./components/BottomNav";

export const metadata = {
  title: "Bolly — Feel Indian Cinema",
  description: "Discover Indian films through emotional reactions, taste profiles, and trusted recommendations.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900 min-h-screen antialiased">
        <Header />
        <main className="pb-20 md:pb-0">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
