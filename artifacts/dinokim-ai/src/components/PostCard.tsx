import { Link } from "wouter";
import { Post } from "@/data/posts";
import { categories } from "@/data/categories";
import { ArrowRight, Clock } from "lucide-react";

interface PostCardProps {
  post: Post;
  variant?: "default" | "featured";
}

export function PostCard({ post, variant = "default" }: PostCardProps) {
  const category = categories.find((c) => c.slug === post.category);
  const readingTime = Math.max(3, Math.ceil(post.body.length / 600));

  const gradients: Record<string, string> = {
    "chatgpt-basics": "from-violet-500/10 to-indigo-500/10",
    "prompt-engineering": "from-indigo-500/10 to-cyan-500/10",
    "ai-tools": "from-cyan-500/10 to-teal-500/10",
    "work-automation": "from-orange-500/10 to-amber-500/10",
    "ai-writing": "from-emerald-500/10 to-green-500/10",
  };
  const gradient = gradients[post.category] || "from-primary/10 to-secondary/10";

  return (
    <Link href={`/posts/${post.slug}`} data-testid={`card-post-${post.id}`}>
      <div className="group h-full flex flex-col bg-card border border-border/60 rounded-2xl overflow-hidden card-lift cursor-pointer">
        {/* Top color bar */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${gradient}`} />

        <div className="p-6 flex flex-col flex-1 gap-4">
          {/* Category + date */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/8 text-primary border border-primary/12">
              {category?.name || post.category}
            </span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {readingTime}분
            </div>
          </div>

          {/* Title + summary */}
          <div className="flex-1 space-y-2">
            <h3 className="text-[17px] font-bold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {post.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
              {post.summary}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50 text-sm">
            <span className="text-xs text-muted-foreground">{post.author} · {post.publishedAt}</span>
            <span className="text-primary font-medium flex items-center gap-1 text-xs group-hover:gap-2 transition-all">
              읽기 <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
