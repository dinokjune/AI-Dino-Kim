import { Link } from "wouter";
import { siteConfig } from "@/data/siteConfig";
import { Sparkles, Mail, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-muted/30 mt-24">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-base">{siteConfig.name}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              {siteConfig.tagline}
            </p>
            <div className="space-y-2">
              <a
                href={`mailto:${siteConfig.email}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                data-testid="link-footer-email"
              >
                <Mail className="w-3.5 h-3.5" />
                {siteConfig.email}
              </a>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {siteConfig.owner.address}
              </div>
            </div>
          </div>

          {/* Site links */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">사이트</h4>
            <ul className="space-y-2.5">
              {[
                { href: "/", label: "홈" },
                { href: "/about", label: "소개" },
                { href: "/categories", label: "카테고리" },
                { href: "/columns", label: "칼럼" },
                { href: "/author", label: "운영자 디노킴" },
                { href: "/contact", label: "문의" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`link-footer-${item.href.replace("/", "") || "home"}`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">법적 고지</h4>
            <ul className="space-y-2.5">
              {[
                { href: "/privacy", label: "개인정보처리방침" },
                { href: "/terms", label: "이용약관" },
                { href: "/disclaimer", label: "면책고지" },
                { href: "/sitemap", label: "사이트맵" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`link-footer-${item.href.replace("/", "")}`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-border/60 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 {siteConfig.name} · 운영자{" "}
            <Link href="/author" className="hover:text-primary transition-colors font-medium" data-testid="link-footer-author">
              디노킴
            </Link>
          </p>
          <p>이 사이트의 콘텐츠는 일반 정보 제공 목적으로 작성되었습니다.</p>
        </div>
      </div>
    </footer>
  );
}
