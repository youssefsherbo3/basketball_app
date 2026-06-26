import { useState } from "react";
import { 
  useListTeams, 
  useGetTeamReport,
  Team
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, BarChart3, Search } from "lucide-react";
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

export default function Reports() {
  const { data: teams, isLoading: teamsLoading } = useListTeams();
  const getTeamReport = useGetTeamReport();
  
  const [teamId, setTeamId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  
  const [hasSearched, setHasSearched] = useState(false);

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId) return;
    
    setHasSearched(true);
    
    getTeamReport.mutate({
      id: parseInt(teamId, 10),
      data: {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      }
    });
  };

  const handleExportCSV = () => {
    if (!teamId) return;
    
    let url = `/api/reports/team/${teamId}/export/csv`;
    const params = new URLSearchParams();
    
    if (dateFrom) params.append("dateFrom", new Date(dateFrom).toISOString());
    if (dateTo) params.append("dateTo", new Date(dateTo).toISOString());
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    window.open(url, "_blank");
  };

  const report = getTeamReport.data;
  const isPending = getTeamReport.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">التقارير</h1>
          <p className="text-muted-foreground mt-1">تحليل الحضور والأداء للاعبين</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>توليد التقرير</CardTitle>
          <CardDescription>اختر الفريق والفترة الزمنية للحصول على إحصائيات مفصلة</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerateReport} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 w-full md:w-1/3">
              <Label htmlFor="team">الفريق</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger dir="rtl">
                  <SelectValue placeholder="اختر الفريق" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {teams?.map(team => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 w-full md:w-1/4">
              <Label htmlFor="dateFrom">من تاريخ</Label>
              <Input 
                id="dateFrom" 
                type="date"
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)} 
              />
            </div>
            
            <div className="space-y-2 w-full md:w-1/4">
              <Label htmlFor="dateTo">إلى تاريخ</Label>
              <Input 
                id="dateTo" 
                type="date"
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)} 
              />
            </div>
            
            <Button type="submit" disabled={!teamId || isPending} className="gap-2 w-full md:w-auto">
              <Search size={16} />
              {isPending ? "جاري البحث..." : "عرض التقرير"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isPending && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      )}

      {report && (
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border mb-4">
            <div>
              <CardTitle className="text-xl text-primary">{report.teamName}</CardTitle>
              <CardDescription>
                إجمالي الجلسات: {report.totalSessions}
              </CardDescription>
            </div>
            <Button onClick={handleExportCSV} variant="outline" className="gap-2">
              <Download size={16} />
              تصدير CSV
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-right">اللاعب</TableHead>
                    <TableHead className="text-center">% الحضور</TableHead>
                    <TableHead className="text-center text-muted-foreground text-xs">ح</TableHead>
                    <TableHead className="text-center text-muted-foreground text-xs">غ</TableHead>
                    <TableHead className="text-center text-muted-foreground text-xs">ت</TableHead>
                    <TableHead className="text-center text-muted-foreground text-xs">م</TableHead>
                    <TableHead className="text-center font-bold">التقييم العام</TableHead>
                    {report.criteria?.map(c => (
                      <TableHead key={c.id} className="text-center text-xs w-20">
                        {c.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.players.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7 + (report.criteria?.length || 0)} className="text-center py-8 text-muted-foreground">
                        لا توجد بيانات لهذه الفترة
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.players.map(player => (
                      <TableRow key={player.playerId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {player.jerseyNumber && (
                              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {player.jerseyNumber}
                              </span>
                            )}
                            {player.playerName}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className={`font-medium ${
                            player.attendancePct >= 80 ? "text-green-600 dark:text-green-400" :
                            player.attendancePct >= 50 ? "text-yellow-600 dark:text-yellow-400" :
                            "text-red-600 dark:text-red-400"
                          }`}>
                            {player.attendancePct.toFixed(0)}%
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm">{player.present}</TableCell>
                        <TableCell className="text-center text-sm text-red-500/70">{player.absent}</TableCell>
                        <TableCell className="text-center text-sm text-yellow-500/70">{player.late}</TableCell>
                        <TableCell className="text-center text-sm text-blue-500/70">{player.excused}</TableCell>
                        <TableCell className="text-center font-bold text-primary">
                          {player.overallAvg ? player.overallAvg.toFixed(1) : "-"}
                        </TableCell>
                        {report.criteria?.map(c => {
                          const criterionAvg = player.criteriaAvgs?.find(ca => ca.criterionId === c.id);
                          return (
                            <TableCell key={c.id} className="text-center text-sm font-mono">
                              {criterionAvg?.avg ? criterionAvg.avg.toFixed(1) : "-"}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="p-4 text-xs text-muted-foreground border-t border-border flex gap-4">
              <span><strong>ح:</strong> حاضر</span>
              <span><strong>غ:</strong> غائب</span>
              <span><strong>ت:</strong> متأخر</span>
              <span><strong>م:</strong> معذور</span>
            </div>
          </CardContent>
        </Card>
      )}
      
      {!hasSearched && !isPending && (
        <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-4">
            <BarChart3 size={32} />
          </div>
          <CardTitle className="mb-2">التقارير والإحصائيات</CardTitle>
          <CardDescription>
            اختر الفريق والفترة الزمنية بالأعلى لعرض التقرير
          </CardDescription>
        </Card>
      )}
    </div>
  );
}
