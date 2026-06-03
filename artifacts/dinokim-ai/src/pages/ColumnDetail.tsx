import { useParams, Link } from "wouter";
import { SEOMeta } from "@/components/SEOMeta";
import { getLocalColumns, getLocalPosts } from "@/lib/store";
import { Breadcrumb } from "@/components/Breadcrumb";
import { AuthorBox } from "@/components/AuthorBox";
import NotFound from "./not-found";
import { Helmet } from "react-helmet-async";
import { siteConfig } from "@/data/siteConfig";

export default function ColumnDetail() {
  const params = useParams();
  const slug = params.slug;
  
  const column = getLocalColumns().find(c => c.slug === slug && c.status === "published");
  
  if (!column) {
    return <NotFound />;
  }

  const relatedPosts = getLocalPosts().filter(p => column.relatedPosts.includes(p.slug) && p.status === "published");

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": column.title,
    "description": column.summary,
    "author": {
      "@type": "Person",
      "name": column.author
    },
    "datePublished": column.publishedAt,
    "dateModified": column.updatedAt
  };

  return (
    <>
      <SEOMeta 
        title={`${column.title} - 칼럼`} 
        description={column.summary} 
        type="article"
        canonical={`/columns/${column.slug}`}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
      </Helmet>

      <article className="container max-w-3xl px-4 py-12 md:py-20">
        <Breadcrumb items={[
          { label: "칼럼", href: "/columns" },
          { label: column.title }
        ]} />

        <header className="mb-12 space-y-6">
          <div className="text-primary font-bold">칼럼</div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight font-serif">
            {column.title}
          </h1>
          {column.subtitle && (
            <p className="text-xl md:text-2xl text-muted-foreground font-medium font-serif italic">
              {column.subtitle}
            </p>
          )}
          <div className="flex items-center text-sm text-muted-foreground space-x-4 border-y py-4">
            <span className="font-medium text-foreground">{column.author}</span>
            <span>발행일: {column.publishedAt}</span>
          </div>
        </header>

        <div className="prose prose-slate dark:prose-invert lg:prose-lg max-w-none prose-p:font-serif prose-p:leading-relaxed prose-headings:font-sans mb-16">
          <div dangerouslySetInnerHTML={{ __html: column.body }} />
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="mb-16 bg-muted/30 p-8 rounded-2xl">
            <h3 className="text-xl font-bold mb-6">칼럼과 관련된 실전 가이드</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedPosts.map(rp => (
                <Link key={rp.id} href={`/posts/${rp.slug}`} className="group p-4 bg-background border rounded-lg hover:border-primary transition-colors hover:shadow-sm">
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
