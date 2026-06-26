import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useListTeams, useCreateTeam, useUpdateTeam, useDeleteTeam, useListCoaches, getListTeamsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus, Settings, Trash2, CalendarDays, MoreVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Team } from "@workspace/api-client-react";

export default function Teams() {
  const { isHeadCoach } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: teams, isLoading } = useListTeams();
  const { data: coaches } = useListCoaches({
    query: {
      enabled: isHeadCoach
    }
  });

  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  
  // Form states
  const [name, setName] = useState("");
  const [ageCategory, setAgeCategory] = useState("");
  const [coachId, setCoachId] = useState<string>("none");

  const resetForm = () => {
    setName("");
    setAgeCategory("");
    setCoachId("none");
  };

  const handleCreateOpen = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleEditOpen = (team: Team) => {
    setSelectedTeam(team);
    setName(team.name);
    setAgeCategory(team.ageCategory || "");
    setCoachId(team.coachId ? team.coachId.toString() : "none");
    setIsEditOpen(true);
  };

  const handleDeleteOpen = (team: Team) => {
    setSelectedTeam(team);
    setIsDeleteOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createTeam.mutate({
      data: {
        name,
        ageCategory: ageCategory || undefined,
        coachId: coachId !== "none" ? parseInt(coachId) : null,
      }
    }, {
      onSuccess: () => {
        toast({ title: "تم إضافة الفريق بنجاح" });
        setIsCreateOpen(false);
        queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() });
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedTeam) return;

    updateTeam.mutate({
      id: selectedTeam.id,
      data: {
        name,
        ageCategory: ageCategory || undefined,
        coachId: coachId !== "none" ? parseInt(coachId) : null,
      }
    }, {
      onSuccess: () => {
        toast({ title: "تم تحديث الفريق بنجاح" });
        setIsEditOpen(false);
        queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() });
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!selectedTeam) return;
    
    deleteTeam.mutate({
      id: selectedTeam.id
    }, {
      onSuccess: () => {
        toast({ title: "تم حذف الفريق بنجاح" });
        setIsDeleteOpen(false);
        queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-[180px] w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">الفرق</h1>
          <p className="text-muted-foreground mt-1">إدارة الفرق واللاعبين والجلسات التدريبية</p>
        </div>
        {isHeadCoach && (
          <Button onClick={handleCreateOpen} className="gap-2">
            <Plus size={18} />
            إضافة فريق
          </Button>
        )}
      </div>

      {teams?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-4">
            <Users size={32} />
          </div>
          <CardTitle className="mb-2">لا توجد فرق</CardTitle>
          <CardDescription>
            {isHeadCoach ? "قم بإضافة فريق جديد للبدء" : "لم يتم تعيين أي فرق لك بعد"}
          </CardDescription>
          {isHeadCoach && (
            <Button onClick={handleCreateOpen} className="mt-4" variant="outline">
              إضافة فريق
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams?.map((team) => (
            <Card key={team.id} className="relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-xl mb-1">{team.name}</CardTitle>
                  <CardDescription>{team.ageCategory || "فئة عمرية غير محددة"}</CardDescription>
                </div>
                {isHeadCoach && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditOpen(team)}>
                        <Settings className="mr-2 h-4 w-4" />
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteOpen(team)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mb-4">
                  <span className="text-sm text-muted-foreground">المدرب: </span>
                  <span className="text-sm font-medium">{team.coachName || "غير معين"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="w-full gap-2 justify-center" asChild>
                    <Link href={`/teams/${team.id}/players`}>
                      <Users size={16} />
                      اللاعبين
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full gap-2 justify-center" asChild>
                    <Link href={`/teams/${team.id}/sessions`}>
                      <CalendarDays size={16} />
                      الجلسات
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>إضافة فريق جديد</DialogTitle>
              <DialogDescription>أدخل بيانات الفريق لإنشائه في النظام.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم الفريق</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="مثال: فريق تحت 16 سنة"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ageCategory">الفئة العمرية (اختياري)</Label>
                <Input 
                  id="ageCategory" 
                  value={ageCategory} 
                  onChange={(e) => setAgeCategory(e.target.value)} 
                  placeholder="مثال: U16"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coachId">المدرب المعين</Label>
                <Select value={coachId} onValueChange={setCoachId}>
                  <SelectTrigger dir="rtl">
                    <SelectValue placeholder="اختر مدرباً" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="none">بدون مدرب</SelectItem>
                    {coaches?.map(coach => (
                      <SelectItem key={coach.id} value={coach.id.toString()}>
                        {coach.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={createTeam.isPending || !name.trim()}>
                {createTeam.isPending ? "جاري الحفظ..." : "حفظ"}
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
              <DialogTitle>تعديل بيانات الفريق</DialogTitle>
              <DialogDescription>تحديث معلومات {selectedTeam?.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">اسم الفريق</Label>
                <Input 
                  id="edit-name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ageCategory">الفئة العمرية (اختياري)</Label>
                <Input 
                  id="edit-ageCategory" 
                  value={ageCategory} 
                  onChange={(e) => setAgeCategory(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-coachId">المدرب المعين</Label>
                <Select value={coachId} onValueChange={setCoachId}>
                  <SelectTrigger dir="rtl">
                    <SelectValue placeholder="اختر مدرباً" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="none">بدون مدرب</SelectItem>
                    {coaches?.map(coach => (
                      <SelectItem key={coach.id} value={coach.id.toString()}>
                        {coach.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={updateTeam.isPending || !name.trim()}>
                {updateTeam.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الفريق "{selectedTeam?.name}" نهائياً. لا يمكن التراجع عن هذا الإجراء وسيتم حذف جميع اللاعبين والجلسات المرتبطة به.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteTeam.isPending ? "جاري الحذف..." : "تأكيد الحذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
