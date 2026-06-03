import { useState } from "react";
import { SEOMeta } from "@/components/SEOMeta";
import { siteConfig } from "@/data/siteConfig";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Send } from "lucide-react";
import { toast } from "sonner";

export default function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate network delay
    setTimeout(() => {
      setIsSubmitting(false);
      toast.info("이메일 전송 기능은 데모입니다.", {
        description: `실제 문의는 ${siteConfig.email} 로 직접 보내주세요.`
      });
    }, 1000);
  };

  return (
    <div className="container max-w-4xl px-4 py-12 md:py-20">
      <SEOMeta title="문의하기" description="AI활용연구소 제휴, 강연, 기고 문의" />
      
      <Breadcrumb items={[{ label: "문의하기" }]} />
      
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">문의하기</h1>
        <p className="text-xl text-muted-foreground">
          강연, 컨설팅, 제휴 등 모든 문의를 환영합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>연락처 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="w-5 h-5 text-primary" />
                <a href={`mailto:${siteConfig.email}`} className="hover:text-primary transition-colors font-medium text-foreground">
                  {siteConfig.email}
                </a>
              </div>
              <p className="text-sm pt-4 border-t">
                확인 후 영업일 기준 24시간 내에 회신해 드립니다.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>온라인 문의</CardTitle>
              <CardDescription>아래 폼을 작성하시거나 직접 이메일을 보내주세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">이름 / 담당자명</label>
                    <Input id="name" required placeholder="홍길동" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">이메일 주소</label>
                    <Input id="email" type="email" required placeholder="example@email.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="subject" className="text-sm font-medium">제목</label>
                  <Input id="subject" required placeholder="[강의 문의] AI 활용법 사내 교육의 건" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium">내용</label>
                  <Textarea id="message" required placeholder="문의하실 내용을 자유롭게 적어주세요. 일정과 예산이 있다면 함께 남겨주시면 좋습니다." className="min-h-[150px]" />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "전송 중..." : <><Send className="w-4 h-4 mr-2" /> 문의 보내기</>}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-4">
                  *이 폼은 데모입니다. 실제로 이메일이 발송되지 않습니다.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
