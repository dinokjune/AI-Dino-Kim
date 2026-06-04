import { Link } from "wouter";
import { siteConfig } from "@/data/siteConfig";
import { categories } from "@/data/categories";
import { getLocalPosts, getLocalColumns } from "@/lib/store";
import { getPostThumbnail } from "@/data/postImages";
import { PostCard } from "@/components/PostCard";
import { CategoryCard } from "@/components/CategoryCard";
import { ColumnCard } from "@/components/ColumnCard";
import { Button } from "@/components/ui/button";
import { SEOMeta } from "@/components/SEOMeta";
import { ArrowRight, BookOpen, PenLine, CheckCircle2, Mail, Sparkles } from "lucide-react";

export default function Home() {
  const posts = getLocalPosts().filter((p) => p.status === "published");
  const columns = getLocalColumns().filter((c) => c.status === "published");

  const featuredPosts = posts.filter((p) => p.isFeatured).slice(0, 3);
  const latestPosts = [...posts]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 5);
  const latestColumns = [...columns]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 2);

  return (
    <>
      <SEOMeta title="홈" description={siteConfig.description} />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/6 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-secondary/6 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 md:px-6 py-14 md:py-20">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/8 border border-primary/15 text-xs font-medium text-primary">
              <Sparkles className="w-3 h-3" />
              AI 활용 정보 가이드
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.08] tracking-tighter text-foreground">
              AI를 일상에서
              <br />
              <span className="gradient-text">제대로 쓰는 법</span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
              {siteConfig.tagline}
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <Link href="/categories" data-testid="link-hero-categories">
                <Button size="default" className="w-full sm:w-auto h-10 px-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                  <BookOpen className="mr-2 h-4 w-4" />
                  가이드 읽기
                </Button>
              </Link>
              <Link href="/columns" data-testid="link-hero-columns">
                <Button
                  size="default"
                  variant="outline"
                  className="w-full sm:w-auto h-10 px-6 rounded-xl border-border/80 hover:border-primary/30 hover:bg-primary/5 transition-colors"
                >
                  <PenLine className="mr-2 h-4 w-4" />
                  디노킴 칼럼
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-6 pt-1">
              {[
                { value: `${posts.length}개`, label: "가이드" },
                { value: `${categories.length}개`, label: "카테고리" },
                { value: `${columns.length}개`, label: "칼럼" },
              ].map((stat) => (
                <div key={stat.label} className="text-center" data-testid={`stat-${stat.label}`}>
                  <div className="text-lg font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 md:px-6">

        {/* ── CATEGORIES ── */}
        <section className="pt-10 pb-6 space-y-4" data-testid="section-categories">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-primary mb-0.5 tracking-wide uppercase">카테고리</p>
              <h2 className="text-xl font-bold tracking-tight">어떤 내용을 찾으시나요?</h2>
            </div>
            <Link
              href="/categories"
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
              data-testid="link-all-categories"
            >
              전체 보기 <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {categories.map((category, i) => (
              <CategoryCard key={category.id} category={category} index={i} />
            ))}
          </div>
        </section>

        {/* ── FEATURED POSTS ── */}
        {featuredPosts.length > 0 && (
          <section className="py-6 space-y-4" data-testid="section-featured">
            <div>
              <p className="text-xs font-semibold text-primary mb-0.5 tracking-wide uppercase">추천 가이드</p>
              <h2 className="text-xl font-bold tracking-tight">꼭 읽어두면 좋은 글</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {featuredPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        )}

        {/* ── LATEST + SIDEBAR ── */}
        <section className="py-6 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Latest posts */}
            <div className="lg:col-span-2 space-y-4" data-testid="section-latest">
              <div>
                <p className="text-xs font-semibold text-primary mb-0.5 tracking-wide uppercase">최신 업데이트</p>
                <h2 className="text-xl font-bold tracking-tight">최근 추가된 가이드</h2>
              </div>
              <div className="space-y-1">
                {latestPosts.map((post) => {
                  const cat = categories.find((c) => c.slug === post.category);
                  const thumb = getPostThumbnail(post.slug);
                  return (
                    <Link key={post.id} href={`/posts/${post.slug}`} data-testid={`link-latest-post-${post.id}`}>
                      <div className="group flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="w-16 h-12 shrink-0 rounded-lg overflow-hidden bg-muted">
                          <img
                            src={thumb}
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[11px] font-semibold text-primary">{cat?.name}</span>
                            <span className="text-[11px] text-muted-foreground">{post.publishedAt}</span>
                          </div>
                          <h3 className="font-semibold text-[13px] text-foreground group-hover:text-primary transition-colors line-clamp-1 leading-snug">
                            {post.title}
                          </h3>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{post.summary}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Sidebar */}
            <aside className="space-y-5" data-testid="sidebar">
              {/* Editorial principles */}
              <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
                <h3 className="font-bold text-sm">편집 원칙</h3>
                <ul className="space-y-2">
                  {siteConfig.editorialPrinciples.map((principle, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{principle}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-2 border-t border-border/50">
                  <Link
                    href="/about"
                    className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                    data-testid="link-sidebar-about"
                  >
                    사이트 소개 자세히 보기 <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Column preview */}
              {latestColumns.length > 0 && (
                <div className="space-y-3" data-testid="section-columns-preview">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm">최신 칼럼</h3>
                    <Link href="/columns" className="text-xs text-primary hover:underline" data-testid="link-more-columns">
                      더 보기
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {latestColumns.map((column) => (
                      <ColumnCard key={column.id} column={column} />
                    ))}
                  </div>
                </div>
              )}

              {/* Author mini box */}
              <div className="rounded-xl border border-border/60 bg-gradient-to-br from-primary/5 to-secondary/5 p-4 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center font-bold text-primary text-xs">
                    김
                  </div>
                  <div>
                    <Link href="/author" className="font-bold text-sm hover:text-primary transition-colors" data-testid="link-sidebar-author">
                      디노킴
                    </Link>
                    <p className="text-[11px] text-muted-foreground">{siteConfig.owner.bio}</p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  AI 도구 활용과 업무 자동화에 관심 있는 분들을 위해 운영합니다.
                </p>
                <Link href="/author" data-testid="link-sidebar-author-full">
                  <Button variant="outline" size="sm" className="w-full rounded-lg text-xs h-7 mt-1">
                    칼럼 보러 가기
                  </Button>
                </Link>
              </div>
            </aside>
          </div>
        </section>
      </div>

      {/* ── CTA BANNER ── */}
      <section className="border-t border-border/60 bg-gradient-to-br from-primary via-primary to-violet-700" data-testid="section-cta">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-14 text-center space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

          <div className="relative z-10 space-y-4 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-medium text-white/90">
              <Mail className="w-3 h-3" />
              문의 환영합니다
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
              더 깊은 이야기가 필요하신가요?
            </h2>
            <p className="text-white/75 text-sm leading-relaxed">
              강의, 컨설팅, 콘텐츠 제안 등 어떤 문의든 이메일로 편하게 연락해주세요.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-1">
              <Link href="/contact" data-testid="link-cta-contact">
                <Button
                  size="default"
                  variant="secondary"
                  className="h-10 px-6 rounded-xl bg-white text-primary font-semibold hover:bg-white/90 transition-colors shadow-lg"
                >
                  문의하기
                </Button>
              </Link>
              <a href={`mailto:${siteConfig.email}`} data-testid="link-cta-email">
                <Button
                  size="default"
                  variant="outline"
                  className="h-10 px-6 rounded-xl border-white/30 text-white bg-transparent hover:bg-white/10 transition-colors"
                >
                  {siteConfig.email}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
