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
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/login");
        return;
      }
      setUser(authUser);

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--paper)" }}>
        <div className="text-center">
          <div className="shimmer" style={{ width: 48, height: 48, borderRadius: "28%", margin: "0 auto 16px" }} />
          <p style={{ color: "var(--ink-mute)", fontSize: 14, fontFamily: "var(--font-ui)" }}>Loading admin panel…</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const navItems = [
    { href: "/admin",        label: "Dashboard" },
    { href: "/admin/trivia", label: "Trivia"    },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--paper)" }}>
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "var(--card)", borderBottom: "1px solid var(--line)" }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: "var(--ink)", fontFamily: "var(--font-serif)" }}>Rasika</span>
            <span style={{ color: "var(--brand)", fontSize: 20, lineHeight: 1 }}>•</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", marginLeft: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Admin</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span style={{ color: "var(--ink-mute)", fontSize: 13 }}>{user?.email}</span>
            <button
              onClick={() => { supabase.auth.signOut(); router.push("/"); }}
              style={{ color: "var(--ink-mute)", fontSize: 13, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui)" }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside style={{ width: 192, borderRight: "1px solid var(--line)", background: "var(--card)" }} className="hidden md:block">
          <nav className="p-4 space-y-2">
            {navItems.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "block", padding: "10px 16px", borderRadius: 10, fontSize: 13,
                    fontWeight: 500, textDecoration: "none", transition: "all 0.15s",
                    fontFamily: "var(--font-ui)",
                    background: isActive ? "rgba(225,75,51,0.06)" : "transparent",
                    color: isActive ? "var(--brand)" : "var(--ink-soft)",
                    borderLeft: isActive ? "3px solid var(--brand)" : "3px solid transparent",
                  }}
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
