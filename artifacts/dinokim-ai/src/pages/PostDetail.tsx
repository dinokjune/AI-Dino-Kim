import { useParams, Link } from "wouter";
import { SEOMeta } from "@/components/SEOMeta";
import { categories } from "@/data/categories";
import { getLocalPosts } from "@/lib/store";
import { Breadcrumb } from "@/components/Breadcrumb";
import { AuthorBox } from "@/components/AuthorBox";
import NotFound from "./not-found";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { siteConfig } from "@/data/siteConfig";
import { postImages } from "@/data/postImages";

interface ArticleImageProps {
  src: string;
  alt: string;
  caption?: string;
}

function ArticleImage({ src, alt, caption }: ArticleImageProps) {
  return (
    <figure className="my-10 rounded-2xl overflow-hidden border border-border/60 shadow-md">
      <img
        src={src}
        alt={alt}
        className="w-full h-64 md:h-96 object-cover"
        loading="lazy"
      />
      {caption && (
        <figcaption className="text-xs text-center text-muted-foreground bg-muted/40 py-2.5 px-4 border-t border-border/40">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

export default function PostDetail() {
  const params = useParams();
  const slug = params.slug;

  const post = getLocalPosts().find((p) => p.slug === slug && p.status === "published");

  if (!post) {
    return <NotFound />;
  }

  const category = categories.find((c) => c.slug === post.category);
  const relatedPosts = getLocalPosts().filter(
    (p) => post.relatedPosts.includes(p.slug) && p.status === "published"
  );

  const images = postImages[post.slug] ?? [];
  const [img1, img2, img3] = images;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.summary,
    image: img1 ? [img1] : undefined,
    author: { "@type": "Person", name: post.author },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `https://${siteConfig.domain}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: category?.name || post.category,
        item: `https://${siteConfig.domain}/categories/${post.category}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `https://${siteConfig.domain}/posts/${post.slug}`,
      },
    ],
  };

  return (
    <>
      <SEOMeta
        title={post.title}
        description={post.summary}
        type="article"
        canonical={`/posts/${post.slug}`}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        {post.faq && post.faq.length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: post.faq.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            })}
          </script>
        )}
      </Helmet>

      <article className="max-w-3xl mx-auto px-4 py-12 md:py-20">
        <Breadcrumb
          items={[
            { label: category?.name || post.category, href: `/categories/${post.category}` },
            { label: post.title },
          ]}
        />

        {/* ── 제목 헤더 ── */}
        <header className="mb-8 space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/15">
              {category?.name || post.category}
            </span>
            {post.isFeatured && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                추천 가이드
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight text-foreground">
            {post.title}
          </h1>
          {post.subtitle && (
            <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed">
              {post.subtitle}
            </p>
          )}
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground border-y border-border/60 py-4">
            <span className="font-semibold text-foreground">{post.author}</span>
            <span>발행일: {post.publishedAt}</span>
            {post.updatedAt !== post.publishedAt && (
              <span>수정일: {post.updatedAt}</span>
            )}
          </div>
        </header>

        {/* ── 이미지 1: 대표 이미지 ── */}
        {img1 && (
          <ArticleImage
            src={img1}
            alt={`${post.title} 대표 이미지`}
            caption={`${post.title} — ${category?.name}`}
          />
        )}

        {/* ── 목차 ── */}
        {post.tableOfContents && post.tableOfContents.length > 0 && (
          <div className="bg-muted/50 border border-border/60 p-6 rounded-2xl mb-10">
            <h3 className="font-bold text-base mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary text-sm">≡</span>
              목차
            </h3>
            <ol className="space-y-2 list-none p-0 m-0">
              {post.tableOfContents.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2.5 m-0">
                  <span className="text-primary font-bold shrink-0 w-5 text-right">{i + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* ── 본문 (상반부) ── */}
        <div
          className="prose prose-slate dark:prose-invert lg:prose-lg max-w-none prose-headings:scroll-mt-20 prose-headings:font-bold prose-a:text-primary hover:prose-a:underline prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: post.body }}
        />

        {/* ── 이미지 2: 본문 중간 ── */}
        {img2 && (
          <ArticleImage
            src={img2}
            alt={`${post.title} 관련 이미지`}
            caption="실제 사용 환경 예시"
          />
        )}

        {/* ── 핵심 요약 / 자주 하는 실수 / 체크리스트 ── */}
        <div className="space-y-5 mt-4 mb-10">
          {post.keyPoints && post.keyPoints.length > 0 && (
            <Card className="border-primary/20 bg-primary/5 rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-primary">
                  <Lightbulb className="w-4 h-4" /> 핵심 요약
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5 m-0 list-none p-0">
                  {post.keyPoints.map((pt, i) => (
                    <li key={i} className="flex gap-2.5 text-sm">
                      <span className="text-primary font-bold shrink-0 mt-0.5">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {post.commonMistakes && post.commonMistakes.length > 0 && (
            <Card className="border-destructive/20 bg-destructive/5 rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4" /> 자주 하는 실수
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5 m-0 list-none p-0">
                  {post.commonMistakes.map((mst, i) => (
                    <li key={i} className="flex gap-2.5 text-sm">
                      <span className="text-destructive font-bold shrink-0">✕</span>
                      <span>{mst}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {post.checklist && post.checklist.length > 0 && (
            <Card className="border-secondary/20 bg-secondary/5 rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-secondary">
                  <CheckCircle2 className="w-4 h-4" /> 체크리스트
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5 m-0 list-none p-0">
                  {post.checklist.map((chk, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <div className="w-4 h-4 rounded border border-secondary/60 shrink-0 mt-0.5" />
                      <span>{chk}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── 이미지 3: 마무리 전 ── */}
        {img3 && (
          <ArticleImage
            src={img3}
            alt={`${post.title} 참고 이미지`}
            caption="실전 활용 팁 참고"
          />
        )}

        {/* ── FAQ ── */}
        {post.faq && post.faq.length > 0 && (
          <section className="mb-10">
            <h3 className="text-xl font-bold mb-5 flex items-center gap-2 border-b border-border/60 pb-3">
              자주 묻는 질문
            </h3>
            <div className="space-y-5">
              {post.faq.map((f, i) => (
                <div key={i} className="rounded-2xl border border-border/60 bg-card p-5">
                  <h4 className="font-bold text-base mb-2 flex items-start gap-2">
                    <span className="text-primary shrink-0">Q.</span>
                    {f.q}
                  </h4>
                  <p className="text-muted-foreground text-sm leading-relaxed pl-6">
                    A. {f.a}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 안내 문구 ── */}
        <div className="flex items-start gap-3 p-4 bg-muted/50 border border-border/60 text-sm text-muted-foreground rounded-2xl mb-10">
          <span className="text-primary shrink-0 mt-0.5">💡</span>
          <span>이 글은 입문자 기준으로 이해하기 쉽게 정리되었으며, 내용은 운영 과정에서 순차적으로 보완될 수 있습니다.</span>
        </div>

        {/* ── 관련 가이드 ── */}
        {relatedPosts.length > 0 && (
          <section className="mb-12">
            <h3 className="text-lg font-bold mb-4">관련 가이드 읽어보기</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedPosts.map((rp) => {
                const rpImages = postImages[rp.slug] ?? [];
                return (
                  <Link key={rp.id} href={`/posts/${rp.slug}`} data-testid={`link-related-post-${rp.id}`}>
                    <div className="group rounded-2xl border border-border/60 overflow-hidden hover:border-primary/40 hover:shadow-md transition-all cursor-pointer bg-card">
                      {rpImages[0] && (
                        <img
                          src={rpImages[0]}
                          alt={rp.title}
                          className="w-full h-32 object-cover"
                          loading="lazy"
                        />
                      )}
                      <div className="p-4">
                        <h4 className="font-bold text-sm group-hover:text-primary transition-colors line-clamp-2 leading-snug">{rp.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{rp.summary}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <AuthorBox />
      </article>
    </>
  );
}
