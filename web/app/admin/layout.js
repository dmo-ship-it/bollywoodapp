"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function checkAdmin() {
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/login");
        return;
      }
      setUser(authUser);

      // Check if user is admin
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("user_id", authUser.id)
        .single();

      if (profile?.role !== "admin") {
        router.push("/");
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    }
    checkAdmin();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⚙️</div>
          <p className="text-stone-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const navItems = [
    { href: "/admin", label: "📊 Dashboard", icon: "📊" },
    { href: "/admin/trivia", label: "🎬 Trivia", icon: "🎬" },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-xl font-black text-stone-900">bolly</span>
            <span className="text-orange-500 text-xl leading-none">•</span>
            <span className="text-xs font-bold text-orange-600 ml-2">ADMIN</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-stone-600">{user?.email}</span>
            <button
              onClick={() => {
                supabase.auth.signOut();
                router.push("/");
              }}
              className="text-stone-500 hover:text-stone-700 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-48 border-r border-stone-200 bg-white hidden md:block">
          <nav className="p-4 space-y-2">
            {navItems.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-orange-50 text-orange-900 border-l-4 border-orange-600"
                      : "text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
