import { SEOMeta } from "@/components/SEOMeta";
import { categories } from "@/data/categories";
import { Breadcrumb } from "@/components/Breadcrumb";
import { CategoryCard } from "@/components/CategoryCard";

export default function Categories() {
  return (
    <div className="container max-w-5xl px-4 py-12 md:py-20">
      <SEOMeta title="전체 카테고리" description="AI활용연구소의 모든 주제별 가이드를 확인하세요." />
      
      <Breadcrumb items={[{ label: "카테고리" }]} />
      
      <div className="space-y-4 mb-12">
        <h1 className="text-4xl font-bold tracking-tight">전체 카테고리</h1>
        <p className="text-xl text-muted-foreground">
          관심 있는 주제를 선택하여 관련 가이드를 확인해보세요.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </div>
  );
}
