import { useState } from "react";
import { 
  useListCriteria, 
  useCreateCriterion, 
  useToggleCriterion,
  getListCriteriaQueryKey,
  Criterion
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Plus, ClipboardList } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Criteria() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: criteria, isLoading } = useListCriteria();
  const createCriterion = useCreateCriterion();
  const toggleCriterion = useToggleCriterion();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const resetForm = () => {
    setName("");
    setDescription("");
  };

  const handleCreateOpen = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleToggle = (criterion: Criterion) => {
    toggleCriterion.mutate({ id: criterion.id }, {
      onSuccess: () => {
        toast({ title: "تم تحديث حالة المعيار" });
        queryClient.invalidateQueries({ queryKey: getListCriteriaQueryKey() });
      }
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createCriterion.mutate({
      data: {
        name,
        description: description || undefined
      }
    }, {
      onSuccess: () => {
        toast({ title: "تم إضافة المعيار بنجاح" });
        setIsCreateOpen(false);
        queryClient.invalidateQueries({ queryKey: getListCriteriaQueryKey() });
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">معايير التقييم</h1>
          <p className="text-muted-foreground mt-1">تحديد المهارات والنقاط التي يقيم على أساسها اللاعبون</p>
        </div>
        <Button onClick={handleCreateOpen} className="gap-2">
          <Plus size={18} />
          إضافة معيار
        </Button>
      </div>

      {criteria?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-4">
            <ClipboardList size={32} />
          </div>
          <CardTitle className="mb-2">لا توجد معايير التقييم</CardTitle>
          <CardDescription>
            قم بإضافة معايير مثل "التسديد"، "الدفاع"، "اللياقة البدنية" للبدء بتقييم اللاعبين
          </CardDescription>
          <Button onClick={handleCreateOpen} className="mt-4" variant="outline">
            إضافة معيار
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {criteria?.map((criterion) => (
            <Card key={criterion.id} className={criterion.isActive ? "border-primary/20" : "border-muted bg-muted/30"}>
              <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg">{criterion.name}</CardTitle>
                  <CardDescription className="line-clamp-2 min-h-10 mt-1">
                    {criterion.description || "لا يوجد وصف"}
                  </CardDescription>
                </div>
                <Switch 
                  checked={criterion.isActive}
                  onCheckedChange={() => handleToggle(criterion)}
                  disabled={toggleCriterion.isPending}
                />
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {criterion.isActive ? (
                    <span className="text-primary font-medium flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary inline-block" /> نشط في التقييم
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground inline-block" /> غير مفعل
                    </span>
                  )}
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
              <DialogTitle>إضافة معيار تقييم جديد</DialogTitle>
              <DialogDescription>أدخل اسم ووصف المعيار ليتم استخدامه في تقييم اللاعبين.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم المعيار</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="مثال: التسديد بالقفز"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">وصف المعيار (اختياري)</Label>
                <Textarea 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="وصف تفصيلي لما يقيسه هذا المعيار..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={createCriterion.isPending || !name.trim()}>
                {createCriterion.isPending ? "جاري الإضافة..." : "إضافة المعيار"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
