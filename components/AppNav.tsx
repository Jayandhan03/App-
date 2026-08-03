"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/delivery", label: "Delivery" },
  { href: "/test-agent", label: "Create agent" },
];

/** Shared top navigation for the signed-in product surfaces. */
export default function AppNav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => {
    const base = href.split("#")[0];
    return pathname === base;
  };

  // Click-outside-to-close. Previously this used onBlur + a setTimeout,
  // which raced against clicks on menu items (e.g. "Sign out") — the menu
  // could unmount before the click on its own contents registered.
  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  return (
    <header
      className="glass"
      style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div className="container between" style={{ height: "var(--nav-h)", display: "flex", alignItems: "center" }}>
        {/* Brand */}
        <Link href="/" className="row" style={{ gap: 10 }}>
          <Logo />
          <span style={{ fontWeight: 600, fontSize: "0.98rem", letterSpacing: "-0.02em", color: "var(--ink)" }}>Leora</span>
        </Link>

        {/* Center links */}
        <nav className="home-nav-links row" style={{ gap: 4, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          {LINKS.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="nav-link"
              data-active={isActive(l.href)}
              style={{
                padding: "7px 12px", borderRadius: "var(--r-full)",
                background: isActive(l.href) ? "var(--surface-2)" : "transparent",
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right */}
        <div className="row" style={{ gap: 10 }}>
          <ThemeToggle />
          <button
            className="nav-burger"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(o => !o)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
          <div style={{ position: "relative" }} ref={menuRef}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="row"
              style={{
                gap: 8, height: 34, padding: "0 8px 0 8px", borderRadius: "var(--r-full)",
                border: "1px solid var(--line-2)", background: "var(--surface)", cursor: "pointer", color: "var(--ink)",
                transition: "border-color 0.18s var(--ease)",
              }}
            >
              {session?.user?.image ? (
                <img src={session.user.image} alt="" referrerPolicy="no-referrer"
                  style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <span className="dot" style={{ background: "var(--accent)" }} />
              )}
              <span style={{ fontSize: "0.82rem", fontWeight: 500, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {session?.user?.name?.split(" ")[0] ?? "Account"}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5, transform: menuOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s var(--ease)" }}><path d="M6 9l6 6 6-6" /></svg>
            </button>

            {menuOpen && (
              <div
                className="card"
                style={{
                  position: "absolute", top: 42, right: 0, minWidth: 210, padding: 6,
                  boxShadow: "var(--shadow-lg)", animation: "riseSm 0.14s var(--ease) both",
                }}
              >
                <div style={{ padding: "9px 10px 8px" }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--ink)" }}>{session?.user?.name}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--ink-3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{session?.user?.email}</div>
                </div>
                <div className="hairline" style={{ margin: "4px 0" }} />
                <Link href="/dashboard" className="menu-row">Dashboard</Link>
                <Link href="/delivery" className="menu-row">Delivery channels</Link>
                <Link href="/test-agent" className="menu-row">Create an agent</Link>
                <div className="hairline" style={{ margin: "4px 0" }} />
                <button onClick={() => signOut({ callbackUrl: "/" })} className="menu-row" style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <nav className="mobile-menu glass" data-open={mobileOpen}>
        {LINKS.map(l => (
          <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
            style={{ color: isActive(l.href) ? "var(--ink)" : undefined, fontWeight: isActive(l.href) ? 600 : undefined }}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
