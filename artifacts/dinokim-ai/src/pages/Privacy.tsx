import { SEOMeta } from "@/components/SEOMeta";
import { Breadcrumb } from "@/components/Breadcrumb";
import { siteConfig } from "@/data/siteConfig";

export default function Privacy() {
  return (
    <div className="container max-w-3xl px-4 py-12 md:py-20">
      <SEOMeta title="개인정보처리방침" />
      <Breadcrumb items={[{ label: "개인정보처리방침" }]} />
      
      <h1 className="text-3xl font-bold tracking-tight mb-8">개인정보처리방침</h1>
      
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <p><strong>시행일자: 2026년 1월 1일</strong></p>
        
        <p>AI활용연구소(이하 "본 사이트"라 합니다)는 이용자의 개인정보를 중요시하며, 개인정보보호법 등 관련 법령을 준수하고 있습니다.</p>

        <h3>1. 수집하는 개인정보 항목 및 수집 방법</h3>
        <p>본 사이트는 기본적으로 정보 제공 목적의 정적 웹사이트이므로, 회원가입을 받지 않으며 불필요한 개인정보를 수집하지 않습니다. 다만, 이메일 문의 시 원활한 의사소통을 위해 다음의 정보를 자발적으로 제공받을 수 있습니다.</p>
        <ul>
          <li><strong>이메일 문의 시 수집항목:</strong> 이름(또는 담당자명), 이메일 주소, 문의 내용</li>
          <li><strong>수집방법:</strong> 이메일 직접 발송 또는 문의 폼 작성</li>
        </ul>

        <h3>2. 개인정보의 수집 및 이용 목적</h3>
        <p>수집된 개인정보는 다음의 목적을 위해서만 이용됩니다.</p>
        <ul>
          <li>문의에 대한 회신 및 의사소통</li>
          <li>제휴, 강연 등 비즈니스 논의</li>
        </ul>

        <h3>3. 개인정보의 보유 및 이용 기간</h3>
        <p>원칙적으로, 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 관련 법령에 의해 보존할 필요가 있는 경우 지정된 기간 동안 보존합니다.</p>
        
        <h3>4. 개인정보의 제3자 제공</h3>
        <p>본 사이트는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 단, 이용자가 사전에 동의한 경우나 법령의 규정에 의거한 경우에는 예외로 합니다.</p>

        <h3>5. 개인정보에 관한 민원 서비스</h3>
        <p>본 사이트는 개인정보 보호와 관련한 불만 및 문의를 처리하기 위해 아래와 같이 담당자를 지정하고 있습니다.</p>
        <ul>
          <li><strong>개인정보 보호 책임자:</strong> {siteConfig.owner.name}</li>
          <li><strong>이메일:</strong> {siteConfig.email}</li>
        </ul>
      </div>
    </div>
  );
}
