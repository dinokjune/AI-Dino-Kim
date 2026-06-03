import { Link } from "wouter";
import { siteConfig } from "@/data/siteConfig";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AuthorBox() {
  return (
    <div className="mt-12 p-6 rounded-lg bg-muted/50 border flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
      <Link href="/author" className="shrink-0">
        <Avatar className="w-20 h-20 border-2 border-primary/20 hover:border-primary transition-colors">
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            DK
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="space-y-2">
        <h4 className="text-lg font-bold">
          <Link href="/author" className="hover:text-primary transition-colors">
            {siteConfig.owner.name}
          </Link>
        </h4>
        <p className="text-muted-foreground text-sm">
          {siteConfig.owner.bio}
        </p>
        <p className="text-sm">
          <a href={`mailto:${siteConfig.owner.email}`} className="text-primary hover:underline">
            {siteConfig.owner.email}
          </a>
        </p>
      </div>
    </div>
  );
}
