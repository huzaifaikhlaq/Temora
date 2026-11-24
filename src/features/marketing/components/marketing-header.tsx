"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type HTMLAttributes } from "react";
import { Icon } from "@/components/shared/icon";

const links = [
  { label: "Features", href: "#features" },
  { label: "Solutions", href: "#solutions" },
  { label: "Enterprise", href: "#enterprise" },
  { label: "Changelog", href: "#changelog" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#documentation" },
];

export function MarketingHeader() {
  const headerRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [isWide, setIsWide] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [popoverSupported, setPopoverSupported] = useState(true);

  useEffect(() => {
    const header = headerRef.current;
    const inner = innerRef.current;
    const menu = menuRef.current;
    if (!header || !inner || !menu) return;

    const supportsPopover =
      "popover" in HTMLElement.prototype && typeof menu.showPopover === "function";
    setPopoverSupported(supportsPopover);

    let active = true;
    const updateLayout = () => {
      if (!active) return;

      const wasOpen = supportsPopover && menu.matches(":popover-open");
      menu.removeAttribute("popover");
      header.classList.add("is-wide");
      const wide = inner.scrollWidth <= inner.clientWidth;

      if (wide) {
        setIsWide(true);
        setMenuOpen(false);
        return;
      }

      header.classList.remove("is-wide");
      if (supportsPopover) {
        menu.setAttribute("popover", "auto");
        if (wasOpen) {
          requestAnimationFrame(() => {
            try {
              menu.showPopover();
            } catch {
              // A resize can close a popover while the browser is changing its layout.
            }
          });
        }
      }
      setIsWide(false);
      setMenuOpen(wasOpen);
    };

    updateLayout();
    const observer = new ResizeObserver(updateLayout);
    observer.observe(inner);
    observer.observe(menu);
    void document.fonts?.ready.then(updateLayout);

    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);

  function handleMenuClick() {
    if (!popoverSupported) setMenuOpen((open) => !open);
  }

  return (
    <>
      <a className="marketing-skip-link" href="#main-content">
        Skip to main content
      </a>
      <header
        ref={headerRef}
        className={`site-header fixed inset-x-0 top-0 z-50 bg-[#faf8ff]/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl ${isWide ? "is-wide" : ""}`}
      >
        <div
          ref={innerRef}
          className="site-header__inner mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-12"
        >
          <Link
            href="/"
            aria-current="page"
            className="flex shrink-0 items-center gap-2.5 rounded-md text-xl font-bold tracking-tight text-[#181b24] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-[#635bff] text-lg font-bold text-white shadow-sm">
              T
            </span>
            <span>Temora</span>
          </Link>

          <nav className="site-nav" aria-label="Primary">
            <button
              type="button"
              aria-label={menuOpen ? "Close site navigation" : "Open site navigation"}
              aria-controls="site-navigation"
              aria-expanded={menuOpen}
              onClick={handleMenuClick}
              className="site-nav-toggle grid size-11 place-items-center rounded-lg border border-[#c7c4d8]/70 bg-white text-[#464555] shadow-sm hover:bg-[#f2f3ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              {...({
                popovertarget: "site-navigation",
                popovertargetaction: "toggle",
              } as ButtonHTMLAttributes<HTMLButtonElement>)}
            >
              <Icon name={menuOpen ? "close" : "menu"} size={20} />
            </button>
            <ul
              ref={menuRef}
              id="site-navigation"
              className="site-nav-list"
              data-manual-open={!popoverSupported && menuOpen ? "true" : undefined}
              onToggle={(event) => {
                setMenuOpen(event.currentTarget.matches(":popover-open"));
              }}
              {...({ popover: "auto" } as HTMLAttributes<HTMLUListElement>)}
            >
              {links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="site-nav-link rounded-md px-2 py-2 text-sm text-[#464555] transition-colors hover:text-[#181b24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <Link
              href="/sign-in"
              className="hidden rounded-md px-2 py-2 text-sm text-[#464555] hover:text-[#181b24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:inline-flex"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#635bff] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#493ee5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-5"
            >
              <span className="hidden sm:inline">Start Free 14-Day Trial</span>
              <span className="sm:hidden">Start free</span>
            </Link>
            <Link
              href="/sign-in"
              aria-label="Account sign in"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-[#493ee5] text-white hover:bg-[#635bff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Icon name="person" size={18} />
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
