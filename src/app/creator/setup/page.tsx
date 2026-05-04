
"use client";

import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { doc, updateDoc, collection, query, where, getDocs, limit, increment, serverTimestamp } from "firebase/firestore";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Sparkles, ShieldCheck, TrendingUp, Info, AlertTriangle, Loader2, Gavel, Users, Gift, Send, Zap } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { trackPlatformActivity } from "@/lib/platform-service";
import { Progress } from "@/components/ui/progress";

export default function CreatorSetupPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [adPrice, setAdPrice] = useState("25");
  const [loading, setLoading] = useState(false);
  const [checkingStats, setCheckingStats] = useState(true);
  
  const [stats, setStats] = useState({ 
    friendsCount: 0, 
    postsCount: 0,
    referralsCount: 0,
    fullEngagementsCount: 0
  });

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    const checkEligibility = async () => {
      try {
        // 1. حساب الأصدقاء (Friendships)
        const friendsQ = query(
          collection(db, "friendships"),
          where("users", "array-contains", user.uid)
        );
        const friendsSnap = await getDocs(friendsQ);
        
        // 2. حساب المنشورات
        const postsQ = query(
          collection(db, "posts"),
          where("authorId", "==", user.uid),
          limit(10)
        );
        const postsSnap = await getDocs(postsQ);

        // 3. حساب التفاعلات الكاملة (Tier 4 Reached)
        const engQ = query(
          collection(db, "engagements"),
          where("userId", "==", user.uid),
          where("tier4_reached", "==", true),
          limit(10)
        );
        const engSnap = await getDocs(engQ);

        setStats({
          friendsCount: friendsSnap.size,
          postsCount: postsSnap.size,
          referralsCount: userData?.referralsCount || 0,
          fullEngagementsCount: engSnap.size
        });
      } catch (e) {
        console.error("Error checking stats:", e);
      } finally {
        setCheckingStats(false);
      }
    };

    checkEligibility();
  }, [user, userData, router]);

  const handleActivate = async () => {
    if (!user || !userData) return;
    
    const fee = 3;
    if (userData.totalPoints < fee) {
      toast({ variant: "destructive", title: "رصيد غير كافي", description: "تحتاج لـ 3 نقاط رسوم صيانة لتفعيل الوضع." });
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        isCreator: true,
        adPrice: Number(adPrice),
        adRevenue: 0,
        avgEngagement: 0,
        totalReach: stats.friendsCount,
        friendsCount: stats.friendsCount,
        totalPoints: increment(-fee),
        lockedPoints: increment(-fee) 
      });

      await trackPlatformActivity('fee', fee, user.uid, "رسوم صيانة تفعيل وضع المبدع");

      toast({ title: "أهلاً بك في عالم المبدعين", description: "تم تفعيل وضع المبدع بنجاح وخصم 3 نقاط رسوم صيانة." });
      router.push("/profile");
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ", description: "فشل تفعيل وضع المبدع." });
    } finally {
      setLoading(false);
    }
  };

  if (checkingStats) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-primary" /></div>;

  const requirements = [
    { 
      label: "دعوة 3 أصدقاء (إحالات)", 
      current: stats.referralsCount, 
      target: 3, 
      icon: Gift,
      color: "text-blue-500"
    },
    { 
      label: "أكثر من 20 صديق", 
      current: stats.friendsCount, 
      target: 21, 
      icon: Users,
      color: "text-green-500"
    },
    { 
      label: "نشر 3 منشورات (نقاط)", 
      current: stats.postsCount, 
      target: 3, 
      icon: Send,
      color: "text-purple-500"
    },
    { 
      label: "3 تفاعلات كاملة (10د+)", 
      current: stats.fullEngagementsCount, 
      target: 3, 
      icon: Zap,
      color: "text-yellow-500"
    }
  ];

  const isEligible = requirements.every(req => req.current >= req.target);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 text-right" dir="rtl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowRight className="rotate-180" />
          </Button>
        </Link>
        <h1 className="text-2xl font-black">وضع المبدع (Creator Mode)</h1>
      </div>

      <div className="bg-gradient-to-br from-primary to-orange-600 rounded-3xl p-8 text-white mb-8 relative overflow-hidden shadow-2xl">
        <div className="relative z-10">
          <Sparkles className="mb-4 w-12 h-12" />
          <h2 className="text-3xl font-black mb-2">كن مؤثراً على NokTek</h2>
          <p className="text-sm opacity-90 leading-relaxed max-w-sm">
            حول تفاعلك وأصدقاءك إلى مصدر دخل مستدام. عند تفعيل وضع المبدع، سيبدأ المعلنون بطلب النشر على حسابك مقابل نقاط حقيقية.
          </p>
        </div>
        <Sparkles className="absolute -bottom-6 -left-6 w-32 h-32 opacity-10 rotate-12" />
      </div>

      <div className="space-y-6">
        <Card className="rounded-3xl border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <ShieldCheck className="text-primary" />
              عداد الأهلية للتفعيل
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {requirements.map((req, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                   <span className="flex items-center gap-2">
                      <req.icon size={14} className={req.color} />
                      {req.label}
                   </span>
                   <span className={req.current >= req.target ? "text-green-500" : "text-muted-foreground"}>
                      {req.current} / {req.target}
                   </span>
                </div>
                <Progress 
                  value={Math.min(100, (req.current / req.target) * 100)} 
                  className={`h-2 ${req.current >= req.target ? 'bg-green-500/10' : ''}`}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {isEligible ? (
          <Card className="rounded-3xl border-primary/20 bg-primary/5 animate-in zoom-in-95 shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <TrendingUp className="text-primary" />
                إعدادات السعر والرسوم
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-background/80 border border-border p-5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gavel size={18} className="text-muted-foreground" />
                  <span className="text-sm font-bold">رسوم صيانة التفعيل (مرة واحدة)</span>
                </div>
                <span className="text-xl font-black text-primary">3 نقاط</span>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold mr-1">سعر المنشور الإعلاني الخاص بك</label>
                <div className="relative">
                  <Input 
                    type="number" 
                    value={adPrice} 
                    onChange={(e) => setAdPrice(e.target.value)}
                    className="h-16 rounded-2xl text-3xl font-black text-center border-2 border-primary/20 focus:border-primary transition-all"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black">
                     نقطة / منشور
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-bold">
                  <Info size={12} className="text-primary" />
                  نقترح البدء بسعر 10-50 نقطة حسب قوة تفاعل حسابك.
                </p>
              </div>

              <Button 
                onClick={handleActivate} 
                className="w-full h-16 rounded-2xl text-xl font-black shadow-xl shadow-primary/20 gap-2"
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" /> : <>دفع الرسوم وتفعيل الوضع <ShieldCheck size={24} /></>}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Alert variant="destructive" className="rounded-3xl border-2 bg-destructive/5 border-destructive/20">
            <AlertTriangle className="h-5 w-5" />
            <div className="mr-2">
              <AlertTitle className="font-black text-lg">أنت لست مؤهلاً بعد 🔒</AlertTitle>
              <AlertDescription className="text-sm font-bold mt-1 opacity-90">
                يجب عليك استكمال كافة الشروط المذكورة في العداد أعلاه لتتمكن من الانضمام لنادي المبدعين والبدء بجني الأرباح من المعلنين.
              </AlertDescription>
            </div>
          </Alert>
        )}
      </div>

      <div className="mt-10 p-6 bg-muted/30 rounded-3xl text-center">
         <p className="text-[10px] text-muted-foreground leading-relaxed font-bold">
           تطبق شروط المبدعين لضمان تقديم محتوى عالي الجودة وحماية مسبح النقاط من التلاعب. بمجرد التفعيل، سيظهر ملفك الشخصي للمعلنين في صفحة "استكشف".
         </p>
      </div>
    </div>
  );
}
