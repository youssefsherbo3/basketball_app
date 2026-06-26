import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  UserSquare, 
  ClipboardList, 
  BarChart3, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "لوحة القيادة", icon: LayoutDashboard, requiresHeadCoach: false },
  { href: "/teams", label: "الفرق", icon: Users, requiresHeadCoach: false },
  { href: "/coaches", label: "المدربين", icon: UserSquare, requiresHeadCoach: true },
  { href: "/criteria", label: "معايير التقييم", icon: ClipboardList, requiresHeadCoach: true },
  { href: "/reports", label: "التقارير", icon: BarChart3, requiresHeadCoach: false },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, isHeadCoach } = useAuth();
  const logout = useLogout();
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => setLocation("/login")
    });
  };

  const filteredNavItems = navItems.filter(
    item => !item.requiresHeadCoach || isHeadCoach
  );

  return (
    <>
      <button 
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-sidebar text-sidebar-foreground rounded-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className={cn(
        "fixed inset-y-0 right-0 z-40 w-64 bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm">كرة</span>
              إدارة الحضور
            </h1>
            <div className="mt-4 pb-4 border-b border-sidebar-border">
              <p className="font-medium">{user?.fullName}</p>
              <p className="text-sm text-sidebar-foreground/70">
                {user?.role === "head_coach" ? "مدرب رئيسي" : "مدرب"}
              </p>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const isActive = location === item.href || location.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer",
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                      : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground"
                  )}>
                    <item.icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-sidebar-border">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
              disabled={logout.isPending}
            >
              <LogOut size={20} />
              <span>تسجيل الخروج</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
