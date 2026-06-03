import { Link } from "wouter";
import { Category } from "@/data/categories";
import { Card, CardContent } from "@/components/ui/card";
import * as Icons from "lucide-react";

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  const IconComponent = (Icons as any)[category.icon] || Icons.Folder;

  return (
    <Link href={`/categories/${category.slug}`}>
      <Card className="h-full hover-elevate transition-all cursor-pointer bg-card group">
        <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <IconComponent className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-lg">{category.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {category.description}
            </p>
          </div>
          <div className="text-xs font-medium text-primary mt-auto">
            {category.postCount}개의 글
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
