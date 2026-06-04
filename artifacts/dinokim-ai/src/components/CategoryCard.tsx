import { Link } from "wouter";
import { Category } from "@/data/categories";
import { ArrowRight } from "lucide-react";
import * as Icons from "lucide-react";

interface CategoryCardProps {
  category: Category;
  index?: number;
}

const iconGradients = [
  { bg: "from-violet-500/15 to-indigo-500/15", text: "text-violet-600", border: "border-violet-200/60" },
  { bg: "from-indigo-500/15 to-cyan-500/15", text: "text-indigo-600", border: "border-indigo-200/60" },
  { bg: "from-cyan-500/15 to-teal-500/15", text: "text-cyan-600", border: "border-cyan-200/60" },
  { bg: "from-orange-500/15 to-amber-500/15", text: "text-orange-600", border: "border-orange-200/60" },
  { bg: "from-emerald-500/15 to-green-500/15", text: "text-emerald-600", border: "border-emerald-200/60" },
];

export function CategoryCard({ category, index = 0 }: CategoryCardProps) {
  const IconComponent = (Icons as any)[category.icon] || Icons.Folder;
  const style = iconGradients[index % iconGradients.length];

  return (
    <Link href={`/categories/${category.slug}`} data-testid={`card-category-${category.id}`}>
      <div className={`group flex items-center gap-3 bg-card border ${style.border} rounded-xl p-4 card-lift cursor-pointer hover:border-primary/30 transition-colors`}>
        {/* Icon */}
        <div className={`w-9 h-9 shrink-0 rounded-lg bg-gradient-to-br ${style.bg} border ${style.border} flex items-center justify-center group-hover:scale-105 transition-transform duration-200`}>
          <IconComponent className={`w-4 h-4 ${style.text}`} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
            {category.name}
          </h3>
          <p className="text-xs text-muted-foreground truncate">{category.description}</p>
        </div>

        {/* Count + arrow */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-muted-foreground">글 {category.postCount}개</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  );
}
