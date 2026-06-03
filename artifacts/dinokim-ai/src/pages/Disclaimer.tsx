import { SEOMeta } from "@/components/SEOMeta";
import { Breadcrumb } from "@/components/Breadcrumb";

export default function Disclaimer() {
  return (
    <div className="container max-w-3xl px-4 py-12 md:py-20">
      <SEOMeta title="면책고지" />
      <Breadcrumb items={[{ label: "면책고지" }]} />
      
      <h1 className="text-3xl font-bold tracking-tight mb-8">면책고지</h1>
      
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <p>AI활용연구소(이하 "본 사이트")를 방문해주셔서 감사합니다. 본 사이트를 이용하시기 전에 아래의 면책 조항을 반드시 읽어보시기 바랍니다.</p>

        <h3>1. 정보의 일반적 성격</h3>
        <p>본 사이트에서 제공하는 모든 텍스트, 가이드, 칼럼 등 콘텐츠는 일반적인 참고 목적으로만 제공됩니다. 인공지능(AI) 기술과 관련 서비스는 매우 빠른 속도로 변화하며, 작성 시점에는 사실이었던 정보가 현재 시점에서는 유효하지 않거나 다를 수 있습니다.</p>

        <h3>2. 기술 판단 및 결정의 책임</h3>
        <p>본 사이트의 정보는 전문적인 기술 상담, 법률 자문, 투자 자문 등을 대체할 수 없습니다. 구체적인 기술 판단이나 중요한 비즈니스/투자 결정에 앞서 반드시 관련 분야 전문가의 상담을 권장합니다. 이용자가 본 사이트의 정보를 신뢰하여 취한 조치로 인해 발생하는 어떠한 직·간접적 손해에 대해서도 본 사이트와 운영자는 법적 책임을 지지 않습니다.</p>

        <h3>3. 외부 링크에 대한 책임</h3>
        <p>본 사이트는 사용자 편의를 위해 외부 웹사이트에 대한 링크를 제공할 수 있습니다. 본 사이트는 연결된 외부 사이트의 콘텐츠, 개인정보 정책, 서비스 품질에 대해 통제권이 없으며, 이에 대한 어떠한 보증이나 책임도 지지 않습니다.</p>

        <h3>4. 특정 제품 추천 및 보증</h3>
        <p>본 사이트에서 언급되거나 소개되는 소프트웨어, AI 서비스, 기업명 등은 정보 제공 목적이며, 별도의 명시가 없는 한 해당 제품이나 기업을 보증하거나 추천하는 것이 아닙니다.</p>

        <p className="mt-8 text-sm text-muted-foreground border-t pt-4">이 면책고지는 2026년 1월 1일부터 적용됩니다.</p>
      </div>
    </div>
  );
}
