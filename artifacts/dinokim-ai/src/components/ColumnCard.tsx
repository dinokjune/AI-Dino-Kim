import { Link } from "wouter";
import { Column } from "@/data/columns";
import { PenLine, ArrowRight } from "lucide-react";

interface ColumnCardProps {
  column: Column;
}

export function ColumnCard({ column }: ColumnCardProps) {
  return (
    <Link href={`/columns/${column.slug}`} data-testid={`card-column-${column.id}`}>
      <div className="group flex flex-col gap-4 bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/15 rounded-2xl p-6 card-lift cursor-pointer hover:border-primary/30 transition-colors">
        {/* Label */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <PenLine className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-xs font-semibold text-primary tracking-wide uppercase">
            디노킴 칼럼
          </span>
        </div>

        {/* Title + summary */}
        <div className="flex-1 space-y-2">
          <h3 className="font-bold text-[16px] leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {column.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {column.summary}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-primary/10">
          <span className="text-xs text-muted-foreground">{column.publishedAt}</span>
          <span className="flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-1.5 transition-all">
            읽기 <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
