import { SEOMeta } from "@/components/SEOMeta";
import { siteConfig } from "@/data/siteConfig";
import { Breadcrumb } from "@/components/Breadcrumb";

export default function About() {
  return (
    <div className="container max-w-3xl px-4 py-12 md:py-20">
      <SEOMeta title="사이트 소개" description="AI활용연구소의 운영 목적과 편집 원칙을 소개합니다." />
      
      <Breadcrumb items={[{ label: "소개" }]} />
      
      <h1 className="text-4xl font-bold tracking-tight mb-8">사이트 소개</h1>
      
      <div className="prose prose-slate dark:prose-invert lg:prose-lg max-w-none">
        <p className="lead text-xl text-muted-foreground mb-12">
          {siteConfig.tagline}
        </p>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">운영 목적</h2>
          <p>
            수많은 AI 도구들이 쏟아져 나오고 있지만, 실제로 내 업무와 일상에 어떻게 적용해야 할지 막막해하는 분들이 많습니다. AI활용연구소는 단순히 최신 기술을 나열하는 것을 넘어, '어떻게 쓰면 내 삶이 편해질까?'라는 본질적인 질문에 대한 해답을 찾고자 합니다.
          </p>
          <p>
            어려운 기술 용어를 최소화하고 누구나 쉽게 따라 할 수 있는 실전 가이드를 제공함으로써, AI가 모두의 유용한 도구가 되도록 돕는 것이 우리의 목표입니다.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">편집 원칙</h2>
          <div className="bg-muted p-6 rounded-lg border">
            <ul className="space-y-4 m-0 list-none p-0">
              {siteConfig.editorialPrinciples.map((principle, i) => (
                <li key={i} className="flex gap-3 text-lg m-0">
                  <span className="text-primary font-bold shrink-0">✓</span>
                  <span>{principle}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">운영자 소개</h2>
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <div className="w-24 h-24 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-3xl font-bold shrink-0">
              DK
            </div>
            <div>
              <h3 className="text-xl font-bold mt-0 mb-2">{siteConfig.owner.name}</h3>
              <p className="mb-2">{siteConfig.owner.bio}</p>
              <p className="text-muted-foreground m-0">
                문의: <a href={`mailto:${siteConfig.owner.email}`} className="text-primary hover:underline">{siteConfig.owner.email}</a>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
