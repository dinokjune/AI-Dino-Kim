import { Link } from "wouter";
import { siteConfig } from "@/data/siteConfig";

export function Footer() {
  return (
    <footer className="border-t bg-muted/40 py-12">
      <div className="container px-4 md:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-lg font-semibold">{siteConfig.name}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {siteConfig.tagline}
            </p>
            <p className="text-sm text-muted-foreground">
              이메일: <a href={`mailto:${siteConfig.email}`} className="hover:text-foreground transition-colors">{siteConfig.email}</a>
            </p>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium">사이트</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-foreground transition-colors">홈</Link></li>
              <li><Link href="/about" className="hover:text-foreground transition-colors">소개</Link></li>
              <li><Link href="/author" className="hover:text-foreground transition-colors">운영자 디노킴</Link></li>
              <li><Link href="/contact" className="hover:text-foreground transition-colors">문의</Link></li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium">법적 고지</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">개인정보처리방침</Link></li>
              <li><Link href="/terms" className="hover:text-foreground transition-colors">이용약관</Link></li>
              <li><Link href="/disclaimer" className="hover:text-foreground transition-colors">면책고지</Link></li>
              <li><Link href="/sitemap" className="hover:text-foreground transition-colors">사이트맵</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
          <p>© 2026 {siteConfig.name} · 운영자 디노킴</p>
        </div>
      </div>
    </footer>
  );
}
