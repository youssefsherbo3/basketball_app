import { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useListPlayers, 
  useCreatePlayer, 
  useUpdatePlayer, 
  useTogglePlayer,
  getListPlayersQueryKey,
  Player
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Plus, Users, ArrowRight, Settings } from "lucide-react";
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

export default function Players() {
  const { id } = useParams<{ id: string }>();
  const teamId = parseInt(id || "0", 10);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: players, isLoading } = useListPlayers(teamId, {
    query: {
      enabled: !!teamId,
      queryKey: getListPlayersQueryKey(teamId)
    }
  });

  const createPlayer = useCreatePlayer();
  const updatePlayer = useUpdatePlayer();
  const togglePlayer = useTogglePlayer();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  
  // Form states
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");

  const resetForm = () => {
    setName("");
    setPosition("");
    setJerseyNumber("");
  };

  const handleCreateOpen = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleEditOpen = (player: Player) => {
    setSelectedPlayer(player);
    setName(player.name);
    setPosition(player.position || "");
    setJerseyNumber(player.jerseyNumber ? player.jerseyNumber.toString() : "");
    setIsEditOpen(true);
  };

  const handleToggle = (player: Player) => {
    togglePlayer.mutate({ id: player.id }, {
      onSuccess: () => {
        toast({ title: "تم تحديث حالة اللاعب" });
        queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey(teamId) });
      }
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createPlayer.mutate({
      data: {
        name,
        position: position || undefined,
        jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : null,
      }
    }, {
      onSuccess: () => {
        toast({ title: "تم إضافة اللاعب بنجاح" });
        setIsCreateOpen(false);
        queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey(teamId) });
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedPlayer) return;

    updatePlayer.mutate({
      id: selectedPlayer.id,
      data: {
        name,
        position: position || undefined,
        jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : null,
      }
    }, {
      onSuccess: () => {
        toast({ title: "تم تحديث بيانات اللاعب بنجاح" });
        setIsEditOpen(false);
        queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey(teamId) });
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/teams">
              <ArrowRight size={18} />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">اللاعبون</h1>
            <p className="text-muted-foreground mt-1">إدارة لاعبي الفريق</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/teams/${teamId}/sessions`}>الجلسات التدريبية</Link>
          </Button>
          <Button onClick={handleCreateOpen} className="gap-2">
            <Plus size={18} />
            إضافة لاعب
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الرقم</TableHead>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">المركز</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Users size={32} className="text-muted-foreground" />
                      <p>لا يوجد لاعبين في هذا الفريق</p>
                      <Button variant="outline" onClick={handleCreateOpen}>إضافة أول لاعب</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                players?.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell className="font-medium text-primary">
                      {player.jerseyNumber || "-"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {player.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {player.position || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <Switch 
                          checked={player.isActive}
                          onCheckedChange={() => handleToggle(player)}
                          disabled={togglePlayer.isPending}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-left">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEditOpen(player)}
                        className="gap-2 text-muted-foreground hover:text-foreground"
                      >
                        <Settings size={14} />
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
              <DialogTitle>إضافة لاعب جديد</DialogTitle>
              <DialogDescription>أدخل بيانات اللاعب للإضافة إلى الفريق.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم اللاعب</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="الاسم الكامل"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jerseyNumber">رقم القميص (اختياري)</Label>
                  <Input 
                    id="jerseyNumber" 
                    type="number"
                    value={jerseyNumber} 
                    onChange={(e) => setJerseyNumber(e.target.value)} 
                    placeholder="23"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">المركز (اختياري)</Label>
                  <Input 
                    id="position" 
                    value={position} 
                    onChange={(e) => setPosition(e.target.value)} 
                    placeholder="مثال: PG, SG"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={createPlayer.isPending || !name.trim()}>
                {createPlayer.isPending ? "جاري الإضافة..." : "إضافة"}
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
              <DialogTitle>تعديل بيانات اللاعب</DialogTitle>
              <DialogDescription>تحديث معلومات اللاعب {selectedPlayer?.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">اسم اللاعب</Label>
                <Input 
                  id="edit-name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-jerseyNumber">رقم القميص (اختياري)</Label>
                  <Input 
                    id="edit-jerseyNumber" 
                    type="number"
                    value={jerseyNumber} 
                    onChange={(e) => setJerseyNumber(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-position">المركز (اختياري)</Label>
                  <Input 
                    id="edit-position" 
                    value={position} 
                    onChange={(e) => setPosition(e.target.value)} 
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={updatePlayer.isPending || !name.trim()}>
                {updatePlayer.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
