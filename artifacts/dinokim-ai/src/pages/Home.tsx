import { Link } from "wouter";
import { siteConfig } from "@/data/siteConfig";
import { categories } from "@/data/categories";
import { getLocalPosts, getLocalColumns } from "@/lib/store";
import { PostCard } from "@/components/PostCard";
import { CategoryCard } from "@/components/CategoryCard";
import { ColumnCard } from "@/components/ColumnCard";
import { Button } from "@/components/ui/button";
import { SEOMeta } from "@/components/SEOMeta";
import { ArrowRight, BookOpen, PenTool } from "lucide-react";

export default function Home() {
  const posts = getLocalPosts().filter(p => p.status === "published");
  const columns = getLocalColumns().filter(c => c.status === "published");
  
  const featuredPosts = posts.filter(p => p.isFeatured).slice(0, 3);
  const latestPosts = posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, 5);
  const latestColumns = columns.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, 2);

  return (
    <>
      <SEOMeta title="홈" description={siteConfig.description} />
      
      {/* Hero Section */}
      <section className="bg-primary/5 py-20 md:py-32">
        <div className="container px-4 md:px-6 text-center space-y-6 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
            {siteConfig.name}
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            {siteConfig.tagline}
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/categories">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base">
                <BookOpen className="mr-2 h-5 w-5" /> 가이드 읽기
              </Button>
            </Link>
            <Link href="/columns">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base bg-background">
                <PenTool className="mr-2 h-5 w-5" /> 디노킴 칼럼
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="container px-4 md:px-6 py-16 space-y-24">
        {/* Categories */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight">어떤 내용을 찾으시나요?</h2>
            <Link href="/categories" className="text-primary hover:underline font-medium flex items-center">
              전체 보기 <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </section>

        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <section className="space-y-8 bg-muted/30 -mx-4 md:-mx-6 px-4 md:px-6 py-16 rounded-3xl">
            <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
              <h2 className="text-3xl font-bold tracking-tight flex items-center">
                <span className="text-2xl mr-3">⭐</span> 추천 가이드
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {featuredPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Latest Posts */}
          <section className="space-y-8 lg:col-span-2">
            <h2 className="text-3xl font-bold tracking-tight border-b pb-4">최신 업데이트</h2>
            <div className="space-y-6">
              {latestPosts.map((post) => (
                <Link key={post.id} href={`/posts/${post.slug}`} className="group block">
                  <div className="flex flex-col md:flex-row gap-4 md:items-center py-4 border-b border-border/50 hover:bg-muted/30 transition-colors p-4 rounded-lg -mx-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                          {categories.find(c => c.slug === post.category)?.name}
                        </span>
                        <span className="text-xs text-muted-foreground">{post.publishedAt}</span>
                      </div>
                      <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-muted-foreground text-sm line-clamp-2">
                        {post.summary}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-12">
            <div className="p-6 rounded-2xl bg-card border shadow-sm">
              <h3 className="font-bold text-lg mb-4">편집 원칙</h3>
              <ul className="space-y-3">
                {siteConfig.editorialPrinciples.map((principle, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="text-primary font-bold">✓</span>
                    {principle}
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-6 border-t">
                <Link href="/about" className="text-sm font-medium text-primary hover:underline flex items-center">
                  사이트 소개 자세히 보기 <ArrowRight className="ml-1 w-4 h-4" />
                </Link>
              </div>
            </div>

            {latestColumns.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">최신 칼럼</h3>
                  <Link href="/columns" className="text-sm text-primary hover:underline">더보기</Link>
                </div>
                <div className="flex flex-col gap-4">
                  {latestColumns.map(column => (
                    <ColumnCard key={column.id} column={column} />
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* CTA */}
        <section className="bg-primary text-primary-foreground rounded-3xl p-8 md:p-16 text-center space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold">더 깊은 이야기가 필요하신가요?</h2>
            <p className="text-primary-foreground/80 text-lg">
              강의, 컨설팅 등 제안이나 피드백이 있다면 언제든 편하게 연락해주세요.
            </p>
            <Link href="/contact">
              <Button size="lg" variant="secondary" className="mt-4">
                문의하기
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
