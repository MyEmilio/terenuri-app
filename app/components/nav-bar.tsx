"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/",        label: "🏠 Hartă",      title: "Lista proprietăți + hartă" },
  { href: "/heatmap", label: "🗺️ Heatmap",    title: "Vizualizare spațială" },
  { href: "/analyze", label: "🔍 Analizează",  title: "Analiză zonă pe hartă" },
  { href: "/scrape",  label: "📡 Scraper",     title: "Caută și importă anunțuri" },
  { href: "/alerts",  label: "🔔 Alerte",      title: "Alerte proprietăți noi" },
];

export default function NavBar() {
  const pathname = usePathname();
  const isDetail = pathname?.startsWith("/terenuri/");

  return (
    <nav style={{
      display: "flex", alignItems: "center", gap: 4,
      background: "#0d0d0d", borderBottom: "1px solid #1e1e1e",
      padding: "0 14px", height: 44, flexShrink: 0,
    }}>
      {/* Logo */}
      <span style={{ fontWeight: 900, fontSize: 15, color: "#f59e0b", marginRight: 12, letterSpacing: -0.5 }}>
        Invest
      </span>

      {/* Linkuri principale */}
      {LINKS.map(({ href, label, title }) => {
        const active = pathname === href || (href === "/" && isDetail);
        return (
          <Link key={href} href={href} title={title}
            style={{
              padding: "5px 12px", borderRadius: 8, fontSize: 13, textDecoration: "none",
              fontWeight: active ? 700 : 400,
              color: active ? "#f59e0b" : "#64748b",
              background: active ? "#1c1200" : "transparent",
              border: active ? "1px solid #713f12" : "1px solid transparent",
              transition: "all 0.15s",
            }}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
