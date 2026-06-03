import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import { Layout } from "@/components/Layout";

// Pages
import Home from "@/pages/Home";
import About from "@/pages/About";
import Author from "@/pages/Author";
import Categories from "@/pages/Categories";
import CategoryDetail from "@/pages/CategoryDetail";
import PostDetail from "@/pages/PostDetail";
import Columns from "@/pages/Columns";
import ColumnDetail from "@/pages/ColumnDetail";
import Contact from "@/pages/Contact";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Disclaimer from "@/pages/Disclaimer";
import Sitemap from "@/pages/Sitemap";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/author" component={Author} />
        <Route path="/categories" component={Categories} />
        <Route path="/categories/:slug" component={CategoryDetail} />
        <Route path="/posts/:slug" component={PostDetail} />
        <Route path="/columns" component={Columns} />
        <Route path="/columns/:slug" component={ColumnDetail} />
        <Route path="/contact" component={Contact} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/disclaimer" component={Disclaimer} />
        <Route path="/sitemap" component={Sitemap} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
