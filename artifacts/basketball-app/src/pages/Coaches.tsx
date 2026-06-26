import { useState } from "react";
import { 
  useListCoaches, 
  useCreateCoach, 
  useUpdateCoach, 
  useToggleCoach,
  getListCoachesQueryKey,
  Coach
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { UserSquare, Plus, Settings, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Coaches() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: coaches, isLoading } = useListCoaches();
  const createCoach = useCreateCoach();
  const updateCoach = useUpdateCoach();
  const toggleCoach = useToggleCoach();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  
  // Form states
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  const resetForm = () => {
    setUsername("");
    setFullName("");
    setPassword("");
  };

  const handleCreateOpen = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleEditOpen = (coach: Coach) => {
    setSelectedCoach(coach);
    setFullName(coach.fullName);
    setPassword("");
    setIsEditOpen(true);
  };

  const handleToggle = (coach: Coach) => {
    toggleCoach.mutate({ id: coach.id }, {
      onSuccess: () => {
        toast({ title: "تم تحديث حالة المدرب" });
        queryClient.invalidateQueries({ queryKey: getListCoachesQueryKey() });
      }
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !fullName.trim() || !password.trim()) return;

    createCoach.mutate({
      data: {
        username,
        fullName,
        password
      }
    }, {
      onSuccess: () => {
        toast({ title: "تم إضافة المدرب بنجاح" });
        setIsCreateOpen(false);
        queryClient.invalidateQueries({ queryKey: getListCoachesQueryKey() });
      },
      onError: (error: any) => {
        toast({ 
          title: "خطأ", 
          description: error?.message || "تعذر إضافة المدرب، قد يكون اسم المستخدم موجوداً مسبقاً",
          variant: "destructive"
        });
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !selectedCoach) return;

    updateCoach.mutate({
      id: selectedCoach.id,
      data: {
        fullName,
        password: password || undefined,
      }
    }, {
      onSuccess: () => {
        toast({ title: "تم تحديث بيانات المدرب بنجاح" });
        setIsEditOpen(false);
        queryClient.invalidateQueries({ queryKey: getListCoachesQueryKey() });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">المدربين</h1>
          <p className="text-muted-foreground mt-1">إدارة طاقم التدريب في الأكاديمية</p>
        </div>
        <Button onClick={handleCreateOpen} className="gap-2">
          <Plus size={18} />
          إضافة مدرب
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">اسم المستخدم</TableHead>
                <TableHead className="text-right">الدور</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coaches?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    لا يوجد مدربين مضافين
                  </TableCell>
                </TableRow>
              ) : (
                coaches?.map((coach) => (
                  <TableRow key={coach.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                          <UserSquare size={16} />
                        </div>
                        {coach.fullName}
                      </div>
                    </TableCell>
                    <TableCell dir="ltr" className="text-right text-muted-foreground">
                      @{coach.username}
                    </TableCell>
                    <TableCell>
                      {coach.role === 'head_coach' ? (
                        <Badge variant="default" className="bg-blue-600">مدرب رئيسي</Badge>
                      ) : (
                        <Badge variant="secondary">مدرب</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <Switch 
                          checked={coach.isActive}
                          onCheckedChange={() => handleToggle(coach)}
                          disabled={toggleCoach.isPending || coach.role === 'head_coach'}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-left">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEditOpen(coach)}
                        className="gap-2 text-muted-foreground hover:text-foreground"
                      >
                        <Edit size={14} />
                        تعديل
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>إضافة مدرب جديد</DialogTitle>
              <DialogDescription>إنشاء حساب مدرب جديد في النظام.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">الاسم الكامل</Label>
                <Input 
                  id="fullName" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  placeholder="محمد أحمد"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">اسم المستخدم</Label>
                <Input 
                  id="username" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  dir="ltr"
                  className="text-right"
                  placeholder="mohammad.a"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input 
                  id="password" 
                  type="password"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  dir="ltr"
                  className="text-right"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={createCoach.isPending || !fullName.trim() || !username.trim() || !password.trim()}>
                {createCoach.isPending ? "جاري الإضافة..." : "إضافة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>تعديل بيانات المدرب</DialogTitle>
              <DialogDescription>تحديث معلومات المدرب {selectedCoach?.fullName}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>اسم المستخدم (لا يمكن تعديله)</Label>
                <Input 
                  value={selectedCoach?.username || ''} 
                  disabled
                  dir="ltr"
                  className="text-right bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-fullName">الاسم الكامل</Label>
                <Input 
                  id="edit-fullName" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password">كلمة المرور (اتركها فارغة للاحتفاظ بالحاليه)</Label>
                <Input 
                  id="edit-password" 
                  type="password"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  dir="ltr"
                  className="text-right"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={updateCoach.isPending || !fullName.trim()}>
                {updateCoach.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
