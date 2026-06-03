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

export default function PostDetail() {
  const params = useParams();
  const slug = params.slug;
  
  const post = getLocalPosts().find(p => p.slug === slug && p.status === "published");
  
  if (!post) {
    return <NotFound />;
  }

  const category = categories.find(c => c.slug === post.category);
  const relatedPosts = getLocalPosts().filter(p => post.relatedPosts.includes(p.slug) && p.status === "published");

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.summary,
    "author": {
      "@type": "Person",
      "name": post.author
    },
    "datePublished": post.publishedAt,
    "dateModified": post.updatedAt
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": `https://${siteConfig.domain}/`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": category?.name || post.category,
        "item": `https://${siteConfig.domain}/categories/${post.category}`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": post.title,
        "item": `https://${siteConfig.domain}/posts/${post.slug}`
      }
    ]
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
              "mainEntity": post.faq.map(f => ({
                "@type": "Question",
                "name": f.q,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": f.a
                }
              }))
            })}
          </script>
        )}
      </Helmet>

      <article className="container max-w-3xl px-4 py-12 md:py-20">
        <Breadcrumb items={[
          { label: category?.name || post.category, href: `/categories/${post.category}` },
          { label: post.title }
        ]} />

        <header className="mb-12 space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
            {post.title}
          </h1>
          {post.subtitle && (
            <p className="text-xl md:text-2xl text-muted-foreground font-medium">
              {post.subtitle}
            </p>
          )}
          <div className="flex items-center text-sm text-muted-foreground space-x-4 border-y py-4">
            <span className="font-medium text-foreground">{post.author}</span>
            <span>발행일: {post.publishedAt}</span>
            {post.updatedAt !== post.publishedAt && <span>수정일: {post.updatedAt}</span>}
          </div>
        </header>

        {/* Table of Contents */}
        {post.tableOfContents && post.tableOfContents.length > 0 && (
          <div className="bg-muted/50 p-6 rounded-xl mb-12">
            <h3 className="font-bold text-lg mb-4 flex items-center">
              <span className="text-xl mr-2">📑</span> 목차
            </h3>
            <ul className="space-y-2 m-0 list-none p-0">
              {post.tableOfContents.map((item, i) => (
                <li key={i} className="text-muted-foreground m-0 text-sm md:text-base">
                  <span className="text-primary font-medium mr-2">{i + 1}.</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div 
          className="prose prose-slate dark:prose-invert lg:prose-lg max-w-none prose-headings:scroll-mt-20 prose-a:text-primary hover:prose-a:underline mb-16"
          dangerouslySetInnerHTML={{ __html: post.body }}
        />

        {/* Info Boxes */}
        <div className="space-y-6 mb-16">
          {post.keyPoints && post.keyPoints.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center text-primary">
                  <Lightbulb className="w-5 h-5 mr-2" /> 핵심 요약
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 m-0 list-none p-0">
                  {post.keyPoints.map((pt, i) => (
                    <li key={i} className="flex gap-2 text-sm md:text-base">
                      <span className="text-primary font-bold shrink-0">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {post.commonMistakes && post.commonMistakes.length > 0 && (
            <Card className="border-destructive/20 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center text-destructive">
                  <AlertTriangle className="w-5 h-5 mr-2" /> 자주 하는 실수
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 m-0 list-none p-0">
                  {post.commonMistakes.map((mst, i) => (
                    <li key={i} className="flex gap-2 text-sm md:text-base">
                      <span className="text-destructive font-bold shrink-0">✕</span>
                      <span>{mst}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {post.checklist && post.checklist.length > 0 && (
            <Card className="border-secondary/20 bg-secondary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center text-secondary">
                  <CheckCircle2 className="w-5 h-5 mr-2" /> 체크리스트
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 m-0 list-none p-0">
                  {post.checklist.map((chk, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm md:text-base">
                      <div className="w-5 h-5 rounded border border-secondary shrink-0 mt-0.5" />
                      <span>{chk}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* FAQ */}
        {post.faq && post.faq.length > 0 && (
          <section className="mb-16">
            <h3 className="text-2xl font-bold mb-6 border-b pb-2">자주 묻는 질문 (FAQ)</h3>
            <div className="space-y-6">
              {post.faq.map((f, i) => (
                <div key={i}>
                  <h4 className="font-bold text-lg mb-2 flex items-start">
                    <span className="text-primary mr-2">Q.</span>
                    {f.q}
                  </h4>
                  <p className="text-muted-foreground pl-6 m-0 leading-relaxed">
                    A. {f.a}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="p-4 bg-muted text-sm text-center text-muted-foreground rounded-lg mb-16">
          💡 이 글은 입문자 기준으로 이해하기 쉽게 정리되었으며, 내용은 순차적으로 보완될 수 있습니다.
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="mb-16">
            <h3 className="text-2xl font-bold mb-6">관련 가이드 읽어보기</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedPosts.map(rp => (
                <Link key={rp.id} href={`/posts/${rp.slug}`} className="group p-4 border rounded-lg hover:border-primary transition-colors hover:bg-muted/30">
                  <h4 className="font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">{rp.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">{rp.summary}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <AuthorBox />
      </article>
    </>
  );
}
