import { SEOMeta } from "@/components/SEOMeta";
import { Breadcrumb } from "@/components/Breadcrumb";
import { siteConfig } from "@/data/siteConfig";

export default function Terms() {
  return (
    <div className="container max-w-3xl px-4 py-12 md:py-20">
      <SEOMeta title="이용약관" />
      <Breadcrumb items={[{ label: "이용약관" }]} />
      
      <h1 className="text-3xl font-bold tracking-tight mb-8">이용약관</h1>
      
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <p><strong>시행일자: 2026년 1월 1일</strong></p>
        
        <h3>제1조 (목적)</h3>
        <p>이 약관은 AI활용연구소(이하 "본 사이트")가 제공하는 모든 콘텐츠 및 관련 서비스의 이용과 관련하여 운영자와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>

        <h3>제2조 (약관의 효력 및 변경)</h3>
        <ol>
          <li>본 약관은 사이트 화면에 게시함으로써 효력이 발생합니다.</li>
          <li>운영자는 합리적인 사유가 발생할 경우, 관련 법령에 위배되지 않는 범위 내에서 본 약관을 개정할 수 있으며, 개정된 약관은 사이트에 공지함으로써 효력이 발생합니다.</li>
        </ol>

        <h3>제3조 (콘텐츠 저작권 및 이용 제한)</h3>
        <ol>
          <li>본 사이트 내의 모든 텍스트, 이미지, 자료 등에 대한 저작권은 운영자({siteConfig.owner.name})에게 있습니다.</li>
          <li>이용자는 본 사이트의 콘텐츠를 영리 목적으로 무단 복제, 배포, 수정, 전송할 수 없습니다. 비영리적 목적의 인용 시에는 반드시 출처(AI활용연구소 링크)를 명시해야 합니다.</li>
        </ol>

        <h3>제4조 (서비스 제공 및 중지)</h3>
        <ol>
          <li>본 사이트는 정보를 무료로 제공하는 것을 원칙으로 합니다.</li>
          <li>시스템 점검, 서버 교체, 운영상의 이유로 예고 없이 서비스가 일시 중단될 수 있습니다.</li>
        </ol>

        <h3>제5조 (책임 제한)</h3>
        <p>본 사이트의 콘텐츠는 작성 당시의 정보와 운영자의 주관적인 해석을 바탕으로 작성되었습니다. 이용자가 본 사이트의 정보를 활용하여 얻은 결과 및 손실에 대해서는 운영자가 법적 책임을 지지 않습니다.</p>

        <h3>제6조 (관할 법원)</h3>
        <p>본 서비스와 관련하여 분쟁이 발생할 경우 운영자의 소재지를 관할하는 법원을 전속 관할법원으로 합니다.</p>
        
        <p className="mt-8">문의사항: <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a></p>
      </div>
    </div>
  );
}
