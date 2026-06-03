import { useParams, Link } from "wouter";
import { SEOMeta } from "@/components/SEOMeta";
import { categories } from "@/data/categories";
import { getLocalPosts } from "@/lib/store";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PostCard } from "@/components/PostCard";
import NotFound from "./not-found";

export default function CategoryDetail() {
  const params = useParams();
  const slug = params.slug;
  
  const category = categories.find(c => c.slug === slug);
  const posts = getLocalPosts()
    .filter(p => p.status === "published" && p.category === slug)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  if (!category) {
    return <NotFound />;
  }

  return (
    <div className="container max-w-5xl px-4 py-12 md:py-20">
      <SEOMeta title={`${category.name} 가이드`} description={category.description} />
      
      <Breadcrumb items={[
        { label: "카테고리", href: "/categories" },
        { label: category.name }
      ]} />
      
      <div className="space-y-4 mb-12 pb-8 border-b">
        <h1 className="text-4xl font-bold tracking-tight">{category.name}</h1>
        <p className="text-xl text-muted-foreground">
          {category.description}
        </p>
        <div className="text-sm font-medium text-primary">
          총 {posts.length}개의 가이드
        </div>
      </div>
      
      {posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground">이 카테고리에 아직 등록된 가이드가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
