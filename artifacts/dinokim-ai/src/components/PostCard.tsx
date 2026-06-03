import { Link } from "wouter";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Post } from "@/data/posts";
import { categories } from "@/data/categories";

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const category = categories.find((c) => c.slug === post.category);

  return (
    <Link href={`/posts/${post.slug}`}>
      <Card className="h-full flex flex-col overflow-hidden hover-elevate transition-shadow cursor-pointer">
        <CardHeader className="space-y-2 pb-4">
          <div className="flex justify-between items-start">
            <Badge variant="secondary" className="bg-secondary/10 text-secondary hover:bg-secondary/20 border-none">
              {category?.name || post.category}
            </Badge>
            <span className="text-xs text-muted-foreground">{post.publishedAt}</span>
          </div>
          <h3 className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">
            {post.title}
          </h3>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="text-muted-foreground text-sm line-clamp-3">
            {post.summary}
          </p>
        </CardContent>
        <CardFooter className="pt-4 border-t text-sm text-muted-foreground flex items-center justify-between">
          <span className="font-medium">{post.author}</span>
          <span className="text-primary group-hover:underline">자세히 보기 &rarr;</span>
        </CardFooter>
      </Card>
    </Link>
  );
}
