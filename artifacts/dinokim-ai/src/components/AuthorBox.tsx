import { Link } from "wouter";
import { siteConfig } from "@/data/siteConfig";
import { Mail, PenLine } from "lucide-react";

export function AuthorBox() {
  return (
    <div className="mt-12 p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/15 flex flex-col md:flex-row gap-6 items-center md:items-start">
      {/* Avatar */}
      <Link href="/author" className="shrink-0" data-testid="link-authorbox-avatar">
        <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center font-extrabold text-primary text-xl hover:scale-105 transition-transform cursor-pointer">
          DK
        </div>
      </Link>

      {/* Info */}
      <div className="space-y-2 text-center md:text-left">
        <div className="flex items-center gap-2 justify-center md:justify-start">
          <Link
            href="/author"
            className="font-bold text-base hover:text-primary transition-colors"
            data-testid="link-authorbox-name"
          >
            {siteConfig.owner.name}
          </Link>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <PenLine className="w-3 h-3" />
            운영자
          </span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{siteConfig.owner.bio}</p>
        <a
          href={`mailto:${siteConfig.owner.email}`}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          data-testid="link-authorbox-email"
        >
          <Mail className="w-3.5 h-3.5" />
          {siteConfig.owner.email}
        </a>
      </div>

      {/* Note */}
      <div className="md:ml-auto text-center md:text-right shrink-0">
        <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">
          이 글은 입문자 기준으로 정리되었으며, 내용은 순차적으로 보완될 수 있습니다.
        </p>
      </div>
    </div>
  );
}
