import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetSession, 
  useSaveAttendance,
  getGetSessionQueryKey,
  EvaluationScore
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Save, Calendar, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PlayerState {
  playerId: number;
  status: string;
  note: string;
  scores: Record<number, number>; // criterionId -> score
}

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const sessionId = parseInt(id || "0", 10);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: session, isLoading } = useGetSession(sessionId, {
    query: {
      enabled: !!sessionId,
      queryKey: getGetSessionQueryKey(sessionId)
    }
  });

  const saveAttendance = useSaveAttendance();
  
  const [playerStates, setPlayerStates] = useState<Record<number, PlayerState>>({});

  // Initialize form state from session data
  useEffect(() => {
    if (session) {
      const initialStates: Record<number, PlayerState> = {};
      
      session.players.forEach(player => {
        const scores: Record<number, number> = {};
        
        // Initialize scores from previous evaluations if they exist
        if (player.evaluations) {
          player.evaluations.forEach(ev => {
            scores[ev.criterionId] = ev.score;
          });
        }
        
        initialStates[player.playerId] = {
          playerId: player.playerId,
          status: player.status || "present", // default to present if null
          note: player.note || "",
          scores
        };
      });
      
      setPlayerStates(initialStates);
    }
  }, [session]);

  const handleStatusChange = (playerId: number, status: string) => {
    setPlayerStates(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], status }
    }));
  };

  const handleNoteChange = (playerId: number, note: string) => {
    setPlayerStates(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], note }
    }));
  };

  const handleScoreChange = (playerId: number, criterionId: number, score: string) => {
    const numScore = parseInt(score, 10);
    if (isNaN(numScore)) return;
    
    // Clamp between 1-10
    const clampedScore = Math.max(1, Math.min(10, numScore));
    
    setPlayerStates(prev => ({
      ...prev,
      [playerId]: { 
        ...prev[playerId], 
        scores: {
          ...prev[playerId].scores,
          [criterionId]: clampedScore
        }
      }
    }));
  };

  const handleSave = () => {
    if (!session) return;
    
    const entries = Object.values(playerStates).map(state => {
      // Only include scores if the player is not absent
      const scoresArray: EvaluationScore[] = state.status !== 'absent' && state.status !== 'excused' 
        ? Object.entries(state.scores).map(([cId, score]) => ({
            criterionId: parseInt(cId, 10),
            score
          }))
        : [];
        
      return {
        playerId: state.playerId,
        status: state.status,
        note: state.note || undefined,
        scores: scoresArray
      };
    });

    saveAttendance.mutate({
      id: sessionId,
      data: { entries }
    }, {
      onSuccess: () => {
        toast({ title: "تم حفظ الحضور والتقييمات بنجاح" });
        queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
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

  if (!session) return null;

  const criteria = session.criteria || [];
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/teams/${session.teamId}/sessions`}>
              <ArrowRight size={18} />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Calendar size={24} className="text-primary" />
              {new Date(session.date).toLocaleDateString("ar-SA", { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h1>
            {session.notes && (
              <p className="text-muted-foreground mt-1 flex items-center gap-1">
                <Info size={14} />
                {session.notes}
              </p>
            )}
          </div>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saveAttendance.isPending}
          className="gap-2 w-full sm:w-auto"
        >
          <Save size={18} />
          {saveAttendance.isPending ? "جاري الحفظ..." : "حفظ الكل"}
        </Button>
      </div>

      <Card className="overflow-hidden border-border shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[50px] text-right">الرقم</TableHead>
                <TableHead className="w-[150px] text-right">الاسم</TableHead>
                <TableHead className="w-[120px] text-right">الحضور</TableHead>
                <TableHead className="w-[150px] text-right">ملاحظات</TableHead>
                {criteria.map(c => (
                  <TableHead key={c.id} className="text-center min-w-[80px]">
                    <span title={c.description || c.name}>{c.name} (1-10)</span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {session.players.map((player) => {
                const state = playerStates[player.playerId] || { 
                  playerId: player.playerId, status: "present", note: "", scores: {} 
                };
                
                const isAbsent = state.status === "absent" || state.status === "excused";
                
                return (
                  <TableRow key={player.playerId} className={isAbsent ? "bg-muted/30 opacity-70" : ""}>
                    <TableCell className="font-medium text-primary">
                      {player.jerseyNumber || "-"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {player.playerName}
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={state.status} 
                        onValueChange={(val) => handleStatusChange(player.playerId, val)}
                      >
                        <SelectTrigger dir="rtl" className={`h-8 ${
                          state.status === "present" ? "border-green-500/50 text-green-700 dark:text-green-400" :
                          state.status === "absent" ? "border-red-500/50 text-red-700 dark:text-red-400" :
                          state.status === "late" ? "border-yellow-500/50 text-yellow-700 dark:text-yellow-400" :
                          "border-blue-500/50 text-blue-700 dark:text-blue-400"
                        }`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="present">حاضر</SelectItem>
                          <SelectItem value="absent">غائب</SelectItem>
                          <SelectItem value="late">متأخر</SelectItem>
                          <SelectItem value="excused">معذور</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={state.note} 
                        onChange={(e) => handleNoteChange(player.playerId, e.target.value)}
                        placeholder="ملاحظات..."
                        className="h-8"
                      />
                    </TableCell>
                    {criteria.map(c => (
                      <TableCell key={c.id} className="text-center">
                        <Input 
                          type="number"
                          min="1"
                          max="10"
                          value={state.scores[c.id] || ""}
                          onChange={(e) => handleScoreChange(player.playerId, c.id, e.target.value)}
                          disabled={isAbsent}
                          className={`w-16 h-8 mx-auto text-center font-mono ${isAbsent ? "opacity-30" : ""}`}
                          placeholder="-"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      {session.players.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-12 text-center border-dashed">
          <CardTitle className="mb-2">لا يوجد لاعبين</CardTitle>
          <CardDescription>
            يرجى إضافة لاعبين إلى الفريق أولاً لتتمكن من تسجيل حضورهم.
          </CardDescription>
        </Card>
      )}
    </div>
  );
}
