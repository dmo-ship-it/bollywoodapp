"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import BottomNav from "./BottomNav";

const NO_NAV_PATHS = ["/login"];

export default function NavWrapper() {
  const pathname = usePathname();
  if (NO_NAV_PATHS.includes(pathname)) return null;
  return (
    <>
      <Header />
      <BottomNav />
    </>
  );
}
