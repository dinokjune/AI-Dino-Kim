import { Link } from "wouter";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Column } from "@/data/columns";
import { PenLine } from "lucide-react";

interface ColumnCardProps {
  column: Column;
}

export function ColumnCard({ column }: ColumnCardProps) {
  return (
    <Link href={`/columns/${column.slug}`}>
      <Card className="h-full flex flex-col bg-muted/30 border-muted-foreground/20 hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader className="space-y-2 pb-4">
          <div className="flex items-center gap-2 text-primary text-sm font-medium mb-2">
            <PenLine className="w-4 h-4" />
            <span>디노킴의 칼럼</span>
          </div>
          <h3 className="text-xl font-bold leading-tight">
            {column.title}
          </h3>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="text-muted-foreground text-sm line-clamp-3">
            {column.summary}
          </p>
        </CardContent>
        <CardFooter className="pt-4 text-xs text-muted-foreground">
          <span>{column.publishedAt}</span>
        </CardFooter>
      </Card>
    </Link>
  );
}
