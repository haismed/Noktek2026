
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { subscribeToLaunchStats, toggleEmergencyMode } from "@/lib/admin-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Activity, Zap, ShieldAlert, TrendingUp, Users, 
  Server, AlertTriangle, Play, Pause, RefreshCw, Beaker, Database, Rocket, Landmark, ShieldCheck, Globe, Calculator, ArrowUpRight, BarChart3, Coins, Heart
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { seedPlatformData } from "@/lib/platform-service";
import Link from "next/link";

export default function LaunchDashboard() {
  const { userData, user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Simulator State
  const [simUsers, setSimUsers] = useState(1000);
  const [simActivePercent, setSimActivePercent] = useState(75);
  const [simInteractionsDay, setSimInteractionsDay] = useState(5);

  useEffect(() => {
    if (userData && !userData.isAdmin) {
      router.push("/");
      return;
    }

    const unsub = subscribeToLaunchStats((data) => {
      setStats(data);
    });

    return () => unsub();
  }, [userData, router]);

  const handleEmergencyToggle = async () => {
    if (!confirm("🚨 تحذير أمني: هل تريد تفعيل مفتاح القتل (Kill Switch)؟ سيتم إيقاف كافة العمليات المالية فوراً!")) return;
    setEmergencyLoading(true);
    try {
      await toggleEmergencyMode(!stats?.emergencyMode);
      toast({ title: stats?.emergencyMode ? "تم استئناف العمليات" : "🚨 تم تفعيل وضع الطوارئ" });
    } catch (e) {
      toast({ variant: "destructive", title: "فشل تغيير الوضع" });
    } finally {
      setEmergencyLoading(false);
    }
  };

  // Simulation Logic
  const interactors = Math.floor(simUsers * 0.49);
  const activeUsers = Math.floor(interactors * (simActivePercent / 100));
  const dailyPoints = activeUsers * simInteractionsDay * 21; 
  const monthlyPoints = dailyPoints * 30 + (simUsers * 10); 
  const platformRevenue = (monthlyPoints * 0.20 * 0.01).toFixed(2);

  // NEW Valuation Logic (Post-Compensation Feature)
  // تم رفع معامل قيمة المستخدم من 1000 إلى 1300 درهم بسبب ارتفاع معدل الاستبقاء (Retention)
  const userValuation = activeUsers * 1300; 
  const revenueValuation = Number(platformRevenue) * 12 * 12; // مضاعف 12x بسبب نظام التعويض الذي يقلل المخاطر
  const assetValue = 107000 + (simUsers * 5); // إضافة قيمة لشبكة المستخدمين المترابطة بنظام FIFO
  const totalValuation = (userValuation + revenueValuation + assetValue).toLocaleString();

  if (!stats) return <div className="min-h-screen flex items-center justify-center bg-black text-white px-8"><RefreshCw className="animate-spin ml-3" /> جاري فحص أنظمة الإطلاق...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-mono" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Real-time Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-zinc-900/50 p-6 rounded-[2.5rem] border border-zinc-800 backdrop-blur-xl">
          <div className="text-right mb-4 md:mb-0">
            <h1 className="text-3xl font-black flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              مركز قيادة NokTek
            </h1>
            <div className="flex items-center gap-3 mt-2">
               <Badge variant="outline" className="border-green-500/50 text-green-500 text-[10px] bg-green-500/5">PRODUCTION LIVE</Badge>
               <p className="text-zinc-500 text-[10px]">v1.1.0-ULTRA | Last Heartbeat: {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Button 
              onClick={handleEmergencyToggle}
              disabled={emergencyLoading}
              variant="destructive" 
              className={cn(
                "h-14 px-8 rounded-2xl font-black gap-2 transition-all flex-1 md:flex-none",
                stats.emergencyMode ? "bg-green-600 hover:bg-green-700 shadow-[0_0_20px_rgba(22,163,74,0.4)]" : "bg-red-600 animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.4)]"
              )}
            >
              {stats.emergencyMode ? <Play /> : <Pause />}
              {stats.emergencyMode ? "إلغاء وضع الطوارئ" : "مفتاح القتل (KILL SWITCH)"}
            </Button>
          </div>
        </div>

        {/* Simulator Tool */}
        <Card className="bg-primary/5 border-primary/20 rounded-[2.5rem] overflow-hidden">
           <CardHeader className="bg-primary/10 border-b border-primary/20">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                 <Calculator className="text-primary" /> محاكي النمو والتقييم (Valuation Simulator)
              </CardTitle>
           </CardHeader>
           <CardContent className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <Label className="text-xs font-bold opacity-70">إجمالي المشتركين المستهدف</Label>
                       <Input type="number" value={simUsers} onChange={e => setSimUsers(Number(e.target.value))} className="bg-black/40 border-zinc-800 rounded-xl h-12 font-black text-xl text-primary" />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-xs font-bold opacity-70">نسبة التفاعل النشط (%)</Label>
                       <Input type="number" value={simActivePercent} onChange={e => setSimActivePercent(Number(e.target.value))} className="bg-black/40 border-zinc-800 rounded-xl h-12 font-black text-xl text-primary" />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-xs font-bold opacity-70">تفاعلات كل مستخدم / يوم</Label>
                       <Input type="number" value={simInteractionsDay} onChange={e => setSimInteractionsDay(Number(e.target.value))} className="bg-black/40 border-zinc-800 rounded-xl h-12 font-black text-xl text-primary" />
                    </div>
                 </div>

                 <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-black/40 p-6 rounded-3xl border border-zinc-800 flex flex-col justify-center">
                       <p className="text-xs font-bold text-zinc-500 mb-1">الأرباح الشهرية المتوقعة</p>
                       <p className="text-4xl font-black text-green-500">{platformRevenue} <span className="text-sm">د.م.</span></p>
                       <p className="text-[10px] text-zinc-600 mt-2">بعد اقتطاع حصص المبدعين ومسبح المكافآت</p>
                    </div>
                    <div className="bg-primary/10 p-6 rounded-3xl border border-primary/20 flex flex-col justify-center">
                       <p className="text-xs font-bold text-primary mb-1">مؤشر أمان الحظ (Safety Index)</p>
                       <div className="flex items-center gap-3">
                          <Heart className="text-primary fill-primary animate-pulse" size={24} />
                          <p className="text-2xl font-black text-white">نشط (FIFO)</p>
                       </div>
                       <p className="text-[10px] text-zinc-500 mt-2">نظام التعويض يرفع القيمة بزيادة الثقة</p>
                    </div>
                    <div className="bg-gradient-to-br from-primary/30 to-purple-900/30 p-6 rounded-3xl border border-primary/40 md:col-span-2 flex items-center justify-between group">
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                             <p className="text-xs font-bold text-primary uppercase tracking-widest">القيمة السوقية التقديرية للمنصة</p>
                             <Badge className="bg-green-600 text-[8px] h-4">POST-COMPENSATION BONUS</Badge>
                          </div>
                          <p className="text-5xl font-black text-white group-hover:scale-105 transition-transform origin-right">{totalValuation} <span className="text-sm">درهم</span></p>
                          <p className="text-[10px] text-zinc-500 mt-2">بناءً على مضاعف الربح 12x + قيمة DAU المعدلة (1300) + أصول الصندوق</p>
                       </div>
                       <BarChart3 className="text-primary opacity-50 group-hover:opacity-100 transition-opacity" size={64} />
                    </div>
                 </div>
              </div>
           </CardContent>
        </Card>

        {/* Live Metrics Monitoring */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="المستخدمين النشطين" 
            value={stats.activeUsers || 0} 
            sub="متصل الآن" 
            icon={Users} 
            color="text-blue-500" 
          />
          <MetricCard 
            title="سيولة مسبح المكافآت" 
            value={`${((stats.distributedRewards / stats.rewardPool) * 100).toFixed(1)}%`} 
            sub={`${(stats.rewardPool - stats.distributedRewards).toLocaleString()} ن متبقية`} 
            icon={Database} 
            color="text-yellow-500" 
          />
          <MetricCard 
            title="معدل التضخم (Inflation)" 
            value={`${stats.inflation}%`} 
            sub={Number(stats.inflation) < 2 ? "نظام مستقر" : "خطر تضخم مرتفع"} 
            icon={TrendingUp} 
            color={Number(stats.inflation) < 2 ? "text-green-500" : "text-red-500"} 
          />
          <MetricCard 
            title="محاولات الاحتيال" 
            value={stats.fraudAttemptsToday || 0} 
            sub="تم حظرها آلياً" 
            icon={ShieldAlert} 
            color={stats.fraudAttemptsToday > 10 ? "text-orange-500" : "text-zinc-500"} 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-1 space-y-4">
              <h3 className="text-sm font-bold text-zinc-500 px-2 uppercase tracking-widest">إدارة الأصول والعمليات</h3>
              <QuickLink href="/admin/withdrawals" title="طلبات السحب البنكي" sub="معالجة الأرباح النقدية" icon={Landmark} color="border-green-500/20" />
              <QuickLink href="/admin/content" title="رقابة المحتوى" sub="مراجعة البلاغات والانتهاكات" icon={ShieldCheck} color="border-blue-500/20" />
              <QuickLink href="/stats" title="لوحة الاقتصاد" sub="تعديل سعر النقطة والدورات" icon={Zap} color="border-yellow-500/20" />
           </div>

           <Card className="lg:col-span-2 bg-zinc-900/30 border-zinc-800 rounded-[2.5rem] overflow-hidden">
              <CardHeader className="border-b border-zinc-800 bg-zinc-900/50">
                <CardTitle className="text-sm flex items-center justify-between">
                   <div className="flex items-center gap-2"><Activity size={16} className="text-primary" /> سجل أحداث النظام (System Logs)</div>
                   <Badge variant="outline" className="text-[9px] border-zinc-700">LIVE FEED</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                 <div className="h-[400px] overflow-y-auto p-6 space-y-4 scrollbar-hide">
                    {stats.systemLogs?.map((log: any, i: number) => (
                      <div key={i} className="flex gap-4 items-start border-b border-zinc-800/50 pb-4 last:border-0">
                         <div className={cn("mt-1 w-2 h-2 rounded-full", log.type === 'error' ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-green-500 shadow-[0_0_8px_green]')} />
                         <div className="flex-1">
                            <div className="flex justify-between items-center">
                               <p className="text-xs font-bold text-zinc-200">{log.message}</p>
                               <span className="text-[9px] text-zinc-600">{log.time}</span>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-1">Source: {log.source} | EventID: {log.id}</p>
                         </div>
                      </div>
                    ))}
                    {(!stats.systemLogs || stats.systemLogs.length === 0) && (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-700 italic space-y-4">
                         <Globe size={48} className="opacity-10" />
                         <p className="text-sm">لا توجد أحداث غير طبيعية.. النظام مستقر تماماً.</p>
                      </div>
                    )}
                 </div>
              </CardContent>
           </Card>
        </div>

        {/* Action Center */}
        <div className="bg-primary/5 border border-primary/10 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="text-right">
              <h3 className="text-xl font-black flex items-center gap-2">توليد بيانات بيئة الاختبار <Beaker className="text-primary" /></h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-md">استخدم هذا الإجراء لتعبئة المنصة بمنشورات تجريبية قبل فتح التسجيل العام للجمهور.</p>
           </div>
           <Button 
              onClick={async () => {
                setSeeding(true);
                await seedPlatformData(user!.uid);
                setSeeding(false);
                toast({ title: "تم توليد البيانات بنجاح" });
              }}
              disabled={seeding}
              className="h-14 px-10 rounded-2xl font-black bg-white text-black hover:bg-zinc-200 gap-2 w-full md:w-auto"
           >
              {seeding ? <RefreshCw className="animate-spin" /> : <Rocket />}
              تشغيل سكريبت البيانات التجريبية
           </Button>
        </div>

      </div>
    </div>
  );
}

function MetricCard({ title, value, sub, icon: Icon, color }: any) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800 rounded-[2rem] overflow-hidden group hover:bg-zinc-900 transition-all border-b-4" style={{ borderColor: color.includes('blue') ? '#3b82f633' : color.includes('yellow') ? '#eab30833' : '#16a34a33' }}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={cn("p-3 rounded-2xl bg-black/50 border border-zinc-800 group-hover:scale-110 transition-transform", color)}>
            <Icon size={24} />
          </div>
          <Badge variant="outline" className="text-[8px] border-zinc-800 text-zinc-500">REALTIME</Badge>
        </div>
        <div className="text-right">
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-tighter">{title}</p>
          <p className="text-3xl font-black mt-1 text-zinc-100">{value}</p>
          <p className={cn("text-[9px] mt-1 font-bold", color)}>{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickLink({ href, title, sub, icon: Icon, color }: any) {
   return (
      <Link href={href} className="block">
         <Card className={cn("bg-zinc-900/40 border-2 rounded-2xl hover:bg-zinc-900 transition-all cursor-pointer group p-5", color)}>
            <div className="flex items-center justify-between">
               <div className="text-right">
                  <h4 className="font-black text-sm text-zinc-100 group-hover:text-primary transition-colors">{title}</h4>
                  <p className="text-[10px] text-muted-foreground">{sub}</p>
               </div>
               <Icon className="text-zinc-700 group-hover:text-primary group-hover:scale-110 transition-all" size={24} />
            </div>
         </Card>
      </Link>
   );
}
