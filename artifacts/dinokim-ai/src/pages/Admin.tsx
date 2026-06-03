import { useState, useEffect } from "react";
import { SEOMeta } from "@/components/SEOMeta";
import { 
  getLocalPosts, saveLocalPosts, 
  getLocalColumns, saveLocalColumns,
  isAdminSession, setAdminSession
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, FileText, PenTool, Settings, LogOut, Download, Upload } from "lucide-react";
import { siteConfig } from "@/data/siteConfig";

export default function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const [posts, setPosts] = useState(getLocalPosts());
  const [columns, setColumns] = useState(getLocalColumns());

  useEffect(() => {
    setIsLoggedIn(isAdminSession());
  }, []);

  const handleLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (password === "demo1234" || !e) {
      setAdminSession(true);
      setIsLoggedIn(true);
      toast({ title: "로그인 성공", description: "관리자 세션이 시작되었습니다." });
    } else {
      toast({ title: "로그인 실패", description: "비밀번호가 올바르지 않습니다.", variant: "destructive" });
    }
  };

  const handleLogout = () => {
    setAdminSession(false);
    setIsLoggedIn(false);
    setPassword("");
    toast({ title: "로그아웃", description: "관리자 세션이 종료되었습니다." });
  };

  const exportData = () => {
    const data = {
      posts: getLocalPosts(),
      columns: getLocalColumns()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dinokim-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isLoggedIn) {
    return (
      <div className="container max-w-md px-4 py-20 flex flex-col items-center justify-center min-h-[70vh]">
        <SEOMeta title="관리자 로그인" />
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">관리자 로그인</CardTitle>
            <CardDescription>
              이 관리자 화면은 정적 사이트용 CMS-lite 데모입니다.<br/>
              실제 보안 인증 시스템이 아닙니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Input 
                  type="password" 
                  placeholder="비밀번호 (demo1234)" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button type="submit">로그인</Button>
                <Button type="button" variant="outline" onClick={() => handleLogin()}>
                  새 비밀번호 없이 데모 로그인
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8">
      <SEOMeta title="관리자 대시보드" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">관리자 대시보드</h1>
          <p className="text-muted-foreground">브라우저 로컬 저장소 기반의 데모 CMS입니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" /> 데이터 백업
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> 로그아웃
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid grid-cols-4 md:w-[600px] mb-8">
          <TabsTrigger value="dashboard"><LayoutDashboard className="w-4 h-4 mr-2 hidden md:block" /> 요약</TabsTrigger>
          <TabsTrigger value="posts"><FileText className="w-4 h-4 mr-2 hidden md:block" /> 글 관리</TabsTrigger>
          <TabsTrigger value="columns"><PenTool className="w-4 h-4 mr-2 hidden md:block" /> 칼럼 관리</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2 hidden md:block" /> 설정</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">총 가이드 글</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{posts.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">발행된 칼럼</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{columns.filter(c => c.status === "published").length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">추천 글</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{posts.filter(p => p.isFeatured).length}</div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>최근 작성된 가이드</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>제목</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>작성일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.slice(0, 5).map(post => (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium">{post.title}</TableCell>
                      <TableCell>{post.status === 'published' ? '발행됨' : '초안'}</TableCell>
                      <TableCell>{post.publishedAt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>가이드 글 관리</CardTitle>
                <CardDescription>전체 가이드 게시물을 관리합니다.</CardDescription>
              </div>
              <Button size="sm">새 글 작성</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>제목</TableHead>
                    <TableHead>카테고리</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>작성일</TableHead>
                    <TableHead>관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map(post => (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium max-w-[200px] truncate" title={post.title}>{post.title}</TableCell>
                      <TableCell>{post.category}</TableCell>
                      <TableCell>{post.status === 'published' ? '발행됨' : '초안'}</TableCell>
                      <TableCell>{post.publishedAt}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">수정</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="columns">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>칼럼 관리</CardTitle>
                <CardDescription>운영자 칼럼을 관리합니다.</CardDescription>
              </div>
              <Button size="sm">새 칼럼 작성</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>제목</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>작성일</TableHead>
                    <TableHead>관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {columns.map(column => (
                    <TableRow key={column.id}>
                      <TableCell className="font-medium max-w-[300px] truncate" title={column.title}>{column.title}</TableCell>
                      <TableCell>{column.status === 'published' ? '발행됨' : '초안'}</TableCell>
                      <TableCell>{column.publishedAt}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">수정</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>사이트 설정</CardTitle>
              <CardDescription>
                이 설정은 브라우저 저장소 기반이며 기기/브라우저가 바뀌면 유지되지 않을 수 있습니다.<br/>
                현재는 데모 목적으로 읽기 전용으로 표시됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">사이트명</label>
                <Input defaultValue={siteConfig.name} readOnly />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">한줄 소개</label>
                <Input defaultValue={siteConfig.tagline} readOnly />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">운영자명</label>
                <Input defaultValue={siteConfig.owner.name} readOnly />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">이메일</label>
                <Input defaultValue={siteConfig.email} readOnly />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
