"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";

export default function Header() {
  const [user,     setUser]     = useState(null);
  const [initials, setInitials] = useState("?");
  const supabase = createClient();
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) setInitials((data.user.email?.split("@")[0] ?? "?").slice(0, 2).toUpperCase());
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setInitials((session.user.email?.split("@")[0] ?? "?").slice(0, 2).toUpperCase());
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: "rgba(250,247,241,0.92)", borderColor: "var(--line)" }}>
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo lockup */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div style={{
            width: 30, height: 30,
            borderRadius: "22%",
            background: "var(--brand)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 3px 10px rgba(225,75,51,0.28)",
          }}>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "#fff", lineHeight: 1, marginTop: -1 }}>R</span>
          </div>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 22, letterSpacing: "0.01em", color: "var(--ink)" }}>
            Rasika<span style={{ color: "var(--brand)" }}>.</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6" style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink-soft)" }}>
          {[
            { href: "/",              label: "Discover"   },
            { href: "/taste-profile", label: "Taste"      },
            { href: "/rankings",      label: "Rankings"   },
            { href: "/community",     label: "Community"  },
            { href: "/people",        label: "People"     },
          ].map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{ color: active ? "var(--ink)" : undefined, fontWeight: active ? 600 : undefined, transition: "color 0.2s" }}
                className="hover:text-[var(--ink)] transition-colors"
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/profile">
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "var(--brand)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: 11, fontWeight: 800,
                  fontFamily: "var(--font-ui)",
                }}>
                  {initials}
                </div>
              </Link>
              <button
                onClick={handleSignOut}
                className="hidden md:block text-xs transition-colors"
                style={{ color: "var(--ink-mute)", fontFamily: "var(--font-ui)" }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden md:block text-sm transition-colors hover:text-[var(--ink)]"
                style={{ color: "var(--ink-soft)", fontFamily: "var(--font-ui)" }}
              >
                Log in
              </Link>
              <Link
                href="/login"
                className="text-xs font-bold px-4 py-2 transition-all hover:-translate-y-px"
                style={{
                  background: "var(--brand)",
                  color: "#fff",
                  borderRadius: "var(--radius-pill)",
                  fontFamily: "var(--font-ui)",
                  boxShadow: "var(--shadow-brand)",
                }}
              >
                Join Rasika
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
