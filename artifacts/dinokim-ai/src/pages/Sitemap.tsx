import { Link } from "wouter";
import { SEOMeta } from "@/components/SEOMeta";
import { categories } from "@/data/categories";
import { getLocalPosts, getLocalColumns } from "@/lib/store";

export default function Sitemap() {
  const posts = getLocalPosts().filter(p => p.status === "published");
  const columns = getLocalColumns().filter(c => c.status === "published");

  return (
    <div className="container max-w-3xl px-4 py-12 md:py-20">
      <SEOMeta title="사이트맵" />
      
      <h1 className="text-3xl font-bold tracking-tight mb-8">사이트맵</h1>
      
      <div className="space-y-12">
        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">기본 페이지</h2>
          <ul className="space-y-2 text-primary">
            <li><Link href="/">홈</Link></li>
            <li><Link href="/about">사이트 소개</Link></li>
            <li><Link href="/author">운영자 디노킴</Link></li>
            <li><Link href="/contact">문의하기</Link></li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">칼럼</h2>
          <ul className="space-y-2 text-primary">
            <li><Link href="/columns" className="font-semibold">전체 칼럼 보기</Link></li>
            {columns.map(c => (
              <li key={c.id} className="pl-4">
                <Link href={`/columns/${c.slug}`}>{c.title}</Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">실전 가이드 (카테고리별)</h2>
          <ul className="space-y-2 text-primary">
            <li><Link href="/categories" className="font-semibold">전체 카테고리 보기</Link></li>
          </ul>
          
          <div className="mt-4 space-y-6">
            {categories.map(category => {
              const catPosts = posts.filter(p => p.category === category.slug);
              return (
                <div key={category.id} className="pl-4">
                  <h3 className="font-semibold text-foreground mb-2">
                    <Link href={`/categories/${category.slug}`}>{category.name}</Link>
                  </h3>
                  <ul className="space-y-2 pl-4 text-sm text-primary">
                    {catPosts.map(p => (
                      <li key={p.id}>
                        <Link href={`/posts/${p.slug}`}>{p.title}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">정책 및 고지</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/privacy" className="hover:text-primary">개인정보처리방침</Link></li>
            <li><Link href="/terms" className="hover:text-primary">이용약관</Link></li>
            <li><Link href="/disclaimer" className="hover:text-primary">면책고지</Link></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
