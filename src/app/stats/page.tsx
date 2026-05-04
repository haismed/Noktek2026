
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp, doc, updateDoc, increment, setDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Wallet, Lock, Coins, TrendingUp, Clock, Megaphone, 
  ArrowRight, Activity, Eye, Heart, MessageCircle, Share2,
  Calendar, ArrowUpRight, ArrowDownRight, Loader2, Wrench, RefreshCw, Zap, Gavel, Send,
  Trophy, ShieldCheck, AlertCircle, PlayCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { startNewCycleLogic } from "@/lib/wallet-service";

export default function StatsPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [platformStats, setPlatformStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "platform", "stats"), (doc) => {
      if (doc.exists()) setPlatformStats(doc.data());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", user.uid),
      limit(10)
    );
    const unsub = onSnapshot(q, (snap) => {
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTransactions(data);
      setTxLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleEndCycle = async () => {
    if (!user || !userData?.isAdmin) return;
    setAdminLoading(true);
    try {
      await updateDoc(doc(db, "platform", "stats"), {
        rewardPoolClosed: true,
        withdrawalOpen: true,
        updatedAt: serverTimestamp()
      });
      toast({ title: "تم إغلاق الدورة", description: "باب السحب مفتوح الآن للمستخدمين." });
    } finally { setAdminLoading(false); }
  };

  const handleStartNewCycle = async () => {
    if (!user || !userData?.isAdmin) return;
    const nextValue = prompt("ادخل سعر النقطة الجديد (بالدرهم):", "0.015");
    if (!nextValue) return;

    setAdminLoading(true);
    try {
      await startNewCycleLogic(user.uid, Number(nextValue));
      toast({ title: "دورة جديدة بدأت 🚀", description: "تم ترحيل الأرصدة وتحديث السعر." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ", description: e.message });
    } finally { setAdminLoading(false); }
  };

  if (loading || !user || !userData) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  const pointValue = platformStats?.pointValueMAD || 0.01;
  const withdrawable = userData.withdrawablePoints || 0;
  const locked = userData.lockedPoints || 0;
  
  const consumedPercent = platformStats ? Math.min(100, (platformStats.distributedRewards / platformStats.rewardPool) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-32 text-right" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowRight className="rotate-180" />
            </Button>
          </Link>
          <h1 className="text-2xl font-black">لوحة الاقتصاد</h1>
        </div>
        {userData.isAdmin && <Badge className="bg-red-500 text-white font-black">إدارة النظام</Badge>}
      </div>

      {/* Cycle Progress */}
      <Card className="rounded-3xl border-border bg-card mb-8 overflow-hidden">
         <CardHeader className="bg-primary/5 py-4 border-b border-border">
            <div className="flex justify-between items-center">
               <Badge variant="secondary" className="font-black">الدورة الاقتصادية #{platformStats?.currentCycle || 1}</Badge>
               <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity size={16} className="text-primary" /> حالة المسبح
               </CardTitle>
            </div>
         </CardHeader>
         <CardContent className="p-6 space-y-6">
            <div className="space-y-3">
               <div className="flex justify-between items-center text-[10px] font-black uppercase">
                  <span className="text-primary">استهلاك الدورة: {consumedPercent.toFixed(1)}%</span>
                  <span className="text-muted-foreground">هدف الإغلاق: 100%</span>
               </div>
               <Progress value={consumedPercent} className="h-3" />
               <p className="text-[9px] text-muted-foreground text-center font-bold">بمجرد اكتمال الشريط، تفتح بوابة السحب فوراً 🚪</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="bg-muted/30 p-4 rounded-2xl text-center">
                  <p className="text-[10px] text-muted-foreground font-bold mb-1">السعر الحالي</p>
                  <p className="text-xl font-black text-primary">{pointValue} <span className="text-[10px]">د.م.</span></p>
               </div>
               <div className="bg-muted/30 p-4 rounded-2xl text-center">
                  <p className="text-[10px] text-muted-foreground font-bold mb-1">حالة السحب</p>
                  {platformStats?.withdrawalOpen ? 
                    <Badge className="bg-green-500 text-white animate-pulse">مفتوح الآن ✅</Badge> : 
                    <Badge variant="outline" className="text-muted-foreground border-border">مغلق 🔒</Badge>
                  }
               </div>
            </div>
         </CardContent>
      </Card>

      {/* User Balances */}
      <div className="grid grid-cols-1 gap-4 mb-8">
        {[
          { label: "رصيدك القابل للسحب (51%)", value: withdrawable, sub: `${(withdrawable * pointValue).toFixed(2)} د.م.`, icon: Wallet, color: "text-green-500", bg: "bg-green-500/10" },
          { label: "رصيدك المجمد (49%)", value: locked, sub: "سيرحل للدورة القادمة", icon: Lock, color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map((s, i) => (
          <Card key={i} className="rounded-3xl border-border bg-card overflow-hidden">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${s.bg} ${s.color} rounded-2xl flex items-center justify-center`}>
                  <s.icon size={24} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold">{s.label}</p>
                  <p className="text-2xl font-black">{s.value.toLocaleString()}</p>
                  <p className={`text-[10px] font-black ${s.color}`}>{s.sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Admin Tools */}
      {userData.isAdmin && (
        <Card className="rounded-3xl border-red-500/30 bg-red-500/5 mb-8 overflow-hidden">
          <CardHeader className="bg-red-500/10 py-3"><CardTitle className="text-xs font-black flex items-center gap-2 text-red-600"><Wrench size={14}/> أدوات التحكم بالدورة</CardTitle></CardHeader>
          <CardContent className="p-6 grid grid-cols-2 gap-4">
            <Button variant="outline" className="border-red-500/50 text-red-600 rounded-xl h-14 font-bold flex flex-col" onClick={handleEndCycle} disabled={adminLoading || platformStats?.withdrawalOpen}>
              <Lock size={18} /> <span className="text-[10px]">إغلاق الدورة يدوياً</span>
            </Button>
            <Button variant="outline" className="border-green-500/50 text-green-600 rounded-xl h-14 font-bold flex flex-col" onClick={handleStartNewCycle} disabled={adminLoading || !platformStats?.withdrawalOpen}>
              <PlayCircle size={18} /> <span className="text-[10px]">بدأ دورة جديدة</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <h3 className="font-black text-lg mb-4 flex items-center gap-2">
        <Clock className="text-primary" size={20} /> آخر العمليات
      </h3>
      <div className="space-y-3">
        {txLoading ? <Loader2 className="animate-spin mx-auto mt-10" /> : transactions.map((tx) => (
          <div key={tx.id} className="bg-card border border-border p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.amount > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                {tx.amount > 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
              </div>
              <div>
                <p className="text-sm font-bold">{tx.description}</p>
                <p className="text-[10px] text-muted-foreground">{tx.createdAt?.toDate ? formatDistanceToNow(tx.createdAt.toDate(), { addSuffix: true, locale: ar }) : "قريباً"}</p>
              </div>
            </div>
            <p className={`font-black ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(1)}
            </p>
          </div>
        ))}
        {transactions.length === 0 && !txLoading && <p className="text-center py-10 text-muted-foreground italic">لا توجد عمليات مسجلة حالياً..</p>}
      </div>

      <BottomNav />
    </div>
  );
}
