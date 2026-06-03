import { Link } from "wouter";
import { SEOMeta } from "@/components/SEOMeta";
import { siteConfig } from "@/data/siteConfig";
import { Breadcrumb } from "@/components/Breadcrumb";
import { getLocalColumns, isAdminSession } from "@/lib/store";
import { ColumnCard } from "@/components/ColumnCard";
import { Button } from "@/components/ui/button";
import { PenSquare } from "lucide-react";

export default function Author() {
  const columns = getLocalColumns().filter(c => c.status === "published");
  const isAdmin = isAdminSession();

  return (
    <div className="container max-w-4xl px-4 py-12 md:py-20">
      <SEOMeta title={`운영자 ${siteConfig.owner.name}`} description={siteConfig.owner.bio} />
      
      <Breadcrumb items={[{ label: "운영자" }]} />
      
      <div className="bg-card border rounded-2xl p-8 md:p-12 mb-16 shadow-sm flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
        <div className="w-32 h-32 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-4xl font-bold shrink-0 shadow-inner">
          DK
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">
            {siteConfig.owner.name}
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl">
            {siteConfig.owner.bio}
          </p>
          <p className="text-primary font-medium">
            <a href={`mailto:${siteConfig.owner.email}`} className="hover:underline">
              {siteConfig.owner.email}
            </a>
          </p>
          
          {isAdmin && (
            <div className="pt-4">
              <Link href="/admin">
                <Button variant="default" className="w-full sm:w-auto">
                  <PenSquare className="mr-2 h-4 w-4" /> 새 칼럼 작성하기
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <section className="space-y-8">
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-2xl font-bold tracking-tight">디노킴의 칼럼</h2>
        </div>
        
        {columns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {columns.map(column => (
              <ColumnCard key={column.id} column={column} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground py-8 text-center bg-muted/30 rounded-lg">등록된 칼럼이 없습니다.</p>
        )}
      </section>
    </div>
  );
}
