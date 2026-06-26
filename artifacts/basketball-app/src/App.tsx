import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Redirect } from "wouter";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Teams from "@/pages/Teams";
import Coaches from "@/pages/Coaches";
import Criteria from "@/pages/Criteria";
import Players from "@/pages/Players";
import Sessions from "@/pages/Sessions";
import SessionDetail from "@/pages/SessionDetail";
import Reports from "@/pages/Reports";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function HeadCoachRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { isHeadCoach } = useAuth();
  
  if (!isHeadCoach) {
    return <Redirect to="/dashboard" />;
  }
  
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Root redirect */}
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      
      <Route path="/teams">
        <ProtectedRoute component={Teams} />
      </Route>
      
      <Route path="/teams/:id/players">
        <ProtectedRoute component={Players} />
      </Route>

      <Route path="/teams/:id/sessions">
        <ProtectedRoute component={Sessions} />
      </Route>

      <Route path="/sessions/:id">
        <ProtectedRoute component={SessionDetail} />
      </Route>

      <Route path="/reports">
        <ProtectedRoute component={Reports} />
      </Route>
      
      <Route path="/coaches">
        <HeadCoachRoute component={Coaches} />
      </Route>
      
      <Route path="/criteria">
        <HeadCoachRoute component={Criteria} />
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
