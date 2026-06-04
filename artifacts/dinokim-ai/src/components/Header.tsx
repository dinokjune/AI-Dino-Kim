import { useState } from "react";
import { Link, useLocation } from "wouter";
import { siteConfig } from "@/data/siteConfig";
import { Button } from "@/components/ui/button";
import { Menu, X, Sparkles } from "lucide-react";

const navLinks = [
  { href: "/categories", label: "카테고리" },
  { href: "/columns", label: "칼럼" },
  { href: "/about", label: "소개" },
  { href: "/contact", label: "문의" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 md:px-6 flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group" data-testid="link-home-logo">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-[17px] tracking-tight text-foreground group-hover:text-primary transition-colors">
            {siteConfig.name}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" data-testid="nav-desktop">
          {navLinks.map((link) => {
            const active = location.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                data-testid={`link-nav-${link.href.replace("/", "")}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link href="/admin" data-testid="link-nav-admin">
            <Button size="sm" className="ml-2 rounded-lg h-8 px-4 text-sm font-medium shadow-sm">
              관리자
            </Button>
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          onClick={() => setOpen(!open)}
          data-testid="button-mobile-menu"
          aria-label="메뉴 열기"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl" data-testid="nav-mobile">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-1">
            {navLinks.map((link) => {
              const active = location.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  data-testid={`link-mobile-nav-${link.href.replace("/", "")}`}
                  className={`px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link href="/admin" onClick={() => setOpen(false)} data-testid="link-mobile-admin">
              <Button size="sm" className="w-full mt-2 rounded-xl h-10">
                관리자
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
