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
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-1 shrink-0">
          <span className="text-xl font-black tracking-tighter text-stone-900">bolly</span>
          <span className="text-orange-500 text-xl leading-none">•</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-stone-500">
          {[
            { href: "/",              label: "Discover"        },
            { href: "/feed",          label: "Feed"            },
            { href: "/taste-profile", label: "🧬 Taste"        },
            { href: "/trivia",        label: "🎬 Trivia"       },
            { href: "/leaderboards",  label: "🏆 Leaderboards" },
            { href: "/community",     label: "Community"       },
            { href: "/rankings",      label: "Rankings"        },
            { href: "/people",        label: "People"          },
          ].map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-colors hover:text-stone-900 ${active ? "text-stone-900 font-semibold" : ""}`}
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
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-xs font-black">
                  {initials}
                </div>
              </Link>
              <button
                onClick={handleSignOut}
                className="hidden md:block text-xs text-stone-400 hover:text-stone-700 transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-sm text-stone-500 hover:text-stone-900 transition-colors hidden md:block">
                Sign in
              </Link>
              <Link
                href="/login"
                className="text-xs bg-orange-600 text-white font-bold px-4 py-1.5 rounded-full hover:bg-orange-500 transition-colors"
              >
                Join free
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
