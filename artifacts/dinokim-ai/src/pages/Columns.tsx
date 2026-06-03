import { SEOMeta } from "@/components/SEOMeta";
import { getLocalColumns } from "@/lib/store";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ColumnCard } from "@/components/ColumnCard";

export default function Columns() {
  const columns = getLocalColumns()
    .filter(c => c.status === "published")
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return (
    <div className="container max-w-5xl px-4 py-12 md:py-20">
      <SEOMeta title="디노킴 칼럼" description="AI 시대, 어떻게 일하고 살아가야 할까? 인사이트를 담은 칼럼입니다." />
      
      <Breadcrumb items={[{ label: "칼럼" }]} />
      
      <div className="space-y-4 mb-12">
        <h1 className="text-4xl font-bold tracking-tight">디노킴 칼럼</h1>
        <p className="text-xl text-muted-foreground">
          단순한 툴 사용법을 넘어 AI 시대에 일하고 살아가는 방법에 대한 생각들
        </p>
      </div>
      
      {columns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {columns.map((column) => (
            <ColumnCard key={column.id} column={column} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground">등록된 칼럼이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
