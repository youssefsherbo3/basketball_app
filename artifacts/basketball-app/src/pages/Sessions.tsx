import { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useListSessions, 
  useCreateSession,
  getListSessionsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CalendarDays, ArrowRight, ClipboardList } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Sessions() {
  const { id } = useParams<{ id: string }>();
  const teamId = parseInt(id || "0", 10);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: sessions, isLoading } = useListSessions(teamId, {
    query: {
      enabled: !!teamId,
      queryKey: getListSessionsQueryKey(teamId)
    }
  });

  const createSession = useCreateSession();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Form states
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setNotes("");
  };

  const handleCreateOpen = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    createSession.mutate({
      data: {
        date: new Date(date).toISOString(),
        notes: notes || undefined
      }
    }, {
      onSuccess: () => {
        toast({ title: "تم إضافة الجلسة التدريبية بنجاح" });
        setIsCreateOpen(false);
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey(teamId) });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[140px] w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/teams">
              <ArrowRight size={18} />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">الجلسات التدريبية</h1>
            <p className="text-muted-foreground mt-1">إدارة جلسات التدريب وتسجيل الحضور</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/teams/${teamId}/players`}>اللاعبون</Link>
          </Button>
          <Button onClick={handleCreateOpen} className="gap-2">
            <Plus size={18} />
            إضافة جلسة
          </Button>
        </div>
      </div>

      {sessions?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-4">
            <CalendarDays size={32} />
          </div>
          <CardTitle className="mb-2">لا توجد جلسات تدريبية</CardTitle>
          <CardDescription>
            قم بإضافة الجلسة الأولى للبدء في تسجيل الحضور والتقييمات
          </CardDescription>
          <Button onClick={handleCreateOpen} className="mt-4" variant="outline">
            إضافة جلسة تدريبية
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions?.map((session) => (
            <Link key={session.id} href={`/sessions/${session.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full border-border">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">
                      {new Date(session.date).toLocaleDateString("ar-SA", { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </CardTitle>
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                      <CalendarDays size={16} />
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2 mt-2">
                    {session.notes || "لا توجد ملاحظات"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm mt-2 pt-3 border-t border-border">
                    <ClipboardList size={14} className="text-muted-foreground" />
                    <span>سجل الحضور: </span>
                    <span className="font-medium text-primary">
                      {session.attendanceCount || 0} لاعب
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>إضافة جلسة تدريبية جديدة</DialogTitle>
              <DialogDescription>حدد تاريخ الجلسة وملاحظات إضافية إن وجدت.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="date">تاريخ الجلسة</Label>
                <Input 
                  id="date" 
                  type="date"
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">الملاحظات (اختياري)</Label>
                <Input 
                  id="notes" 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="موضوع التدريب، تمارين خاصة..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={createSession.isPending || !date}>
                {createSession.isPending ? "جاري الإضافة..." : "إضافة الجلسة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
