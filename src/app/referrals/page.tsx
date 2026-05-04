"use client";

import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from "firebase/firestore";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowRight, Gift, Users, Trophy, Sparkles, Copy, Check, 
  Loader2, Star, TrendingUp, Zap, Clock, ShieldCheck, Info
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function ReferralsPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [referralLink, setReferralLink] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (userData?.referralCode && typeof window !== 'undefined') {
      setReferralLink(`${window.location.origin}/signup?ref=${userData.referralCode}`);
    } else if (user?.uid && typeof window !== 'undefined') {
      setReferralLink(`${window.location.origin}/signup?ref=${user.uid.slice(0, 6)}`);
    }
  }, [userData, user]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users"),
      where("referredBy", "==", user.uid),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setReferrals(data);
      setLoading(false);
    }, (error) => {
      console.error("Referrals query error:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "تم نسخ رابط الدعوة" });
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 text-right" dir="rtl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowRight className="rotate-180" />
          </Button>
        </Link>
        <h1 className="text-2xl font-black">نظام مكافآت الدعوة</h1>
      </div>

      <div className="bg-gradient-to-br from-primary to-purple-800 rounded-3xl p-8 text-white mb-8 relative overflow-hidden shadow-2xl">
         <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md">
               <Gift size={32} className="text-white" />
            </div>
            <h2 className="text-3xl font-black mb-2">شارك NokTek واربح!</h2>
            <p className="text-sm opacity-90 leading-relaxed mb-6">
               احصل على <span className="font-black text-yellow-400">25 نقطة</span> عن كل صديق يسجل من خلالك، وسيحصل صديقك أيضاً على <span className="font-black text-yellow-400">25 نقطة</span> إضافية.
            </p>
            
            <div className="bg-black/20 p-4 rounded-2xl backdrop-blur-md border border-white/10 flex items-center justify-between gap-4">
               <div className="flex-1 overflow-hidden">
                  <p className="text-[10px] font-bold text-white/70 mb-1">رابطك التسويقي</p>
                  <p className="text-xs font-mono truncate">{referralLink || 'جاري التجهيز...'}</p>
               </div>
               <Button onClick={handleCopy} disabled={!referralLink} className="bg-white text-primary hover:bg-white/90 font-black rounded-xl shrink-0">
                  {copied ? <Check size={18} /> : <Copy size={18} />}
               </Button>
            </div>
         </div>
         <Sparkles className="absolute -bottom-8 -left-8 w-48 h-48 opacity-10 rotate-12" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-10">
         <Card className="rounded-3xl border-border bg-card">
            <CardContent className="p-6 text-center">
               <Users className="mx-auto text-primary mb-2" size={24} />
               <p className="text-2xl font-black">{referrals.length}</p>
               <p className="text-[10px] text-muted-foreground font-bold">دعوة ناجحة</p>
            </CardContent>
         </Card>
         <Card className="rounded-3xl border-border bg-card">
            <CardContent className="p-6 text-center">
               <Trophy className="mx-auto text-yellow-500 mb-2" size={24} />
               <p className="text-2xl font-black">{(referrals.length * 25).toFixed(0)}</p>
               <p className="text-[10px] text-muted-foreground font-bold">إجمالي أرباح الدعوات</p>
            </CardContent>
         </Card>
      </div>

      <div className="space-y-6 mb-12">
        <h3 className="font-black text-xl flex items-center gap-2 text-primary">
          <Zap size={24} className="fill-primary" />
          مستقبل الأرباح الذكية مع NokTek
        </h3>
        
        <Card className="rounded-3xl border-primary/20 bg-primary/5 overflow-hidden">
          <CardContent className="p-6 space-y-6 text-sm leading-relaxed">
            <div className="space-y-4">
              <p className="font-bold text-foreground">
                في NokTek، لا نؤمن بالمكافآت المؤقتة… بل نبني لك نظام دخل مستدام ينمو معك يومًا بعد يوم. برنامج الإحالات لدينا ليس مجرد دعوة أصدقاء، بل هو استثمار حقيقي في شبكة علاقاتك الرقمية.
              </p>
              
              <div className="h-px bg-primary/10 w-full" />
              
              <div className="space-y-3">
                <h4 className="font-black text-primary flex items-center gap-2">
                  <Star size={18} /> ميزة “المنشور المميز” اليومية
                </h4>
                <p className="text-xs text-muted-foreground">حوّل كل إحالة إلى قوة انتشار! كل مستخدم ينضم عبر رابطك ويبدأ أول تفاعل ناجح يمنحك فرصة لعرض منشورك كـ منشور مميز داخل شبكته.</p>
                <div className="grid grid-cols-1 gap-2 bg-card p-4 rounded-2xl border border-border">
                  <div className="flex justify-between items-center"><span className="font-bold">الدرجة الأولى (دعوة مباشرة):</span> <Badge variant="secondary">60 ثانية ظُهور</Badge></div>
                  <div className="flex justify-between items-center"><span className="font-bold">الدرجة الثانية:</span> <Badge variant="secondary">30 ثانية ظُهور</Badge></div>
                  <div className="flex justify-between items-center"><span className="font-bold">الدرجة الثالثة:</span> <Badge variant="secondary">15 ثانية ظُهور</Badge></div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="font-black text-green-600 flex items-center gap-2">
                  <TrendingUp size={18} /> أرباح مستمرة… مدى الحياة
                </h4>
                <p className="text-xs text-muted-foreground">دع شبكتك تعمل من أجلك! تكسب نسبة دائمة من أرباح المنصة عن كل نشاط داخل شبكتك:</p>
                <div className="flex gap-2 justify-around py-2">
                   <div className="text-center bg-card p-3 rounded-2xl border border-border flex-1">
                      <p className="text-[10px] font-bold text-muted-foreground">الدرجة 1</p>
                      <p className="text-lg font-black text-green-600">10%</p>
                   </div>
                   <div className="text-center bg-card p-3 rounded-2xl border border-border flex-1">
                      <p className="text-[10px] font-bold text-muted-foreground">الدرجة 2</p>
                      <p className="text-lg font-black text-green-600">5%</p>
                   </div>
                   <div className="text-center bg-card p-3 rounded-2xl border border-border flex-1">
                      <p className="text-[10px] font-bold text-muted-foreground">الدرجة 3</p>
                      <p className="text-lg font-black text-green-600">2.5%</p>
                   </div>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl space-y-2">
                <h4 className="font-bold text-yellow-700 flex items-center gap-2 text-xs">
                  <ShieldCheck size={16} /> متى تبدأ الأرباح؟
                </h4>
                <p className="text-[10px] text-yellow-700 leading-relaxed">
                  يجب على المدعو إنشاء حساب عبر رابطك وإكمال أول تفاعل ناجح داخل المنصة. وبمجرد تحقق ذلك… تبدأ أرباحك وميزة الظهور مباشرة.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
         <h3 className="font-black text-lg flex items-center gap-2">
            <Clock size={20} className="text-primary" />
            تاريخ الإحالات الناجحة
         </h3>
         
         {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
         ) : referrals.length > 0 ? (
            <div className="space-y-3">
               {referrals.map((refUser) => (
                  <Card key={refUser.id} className="rounded-2xl border-border bg-card/50 overflow-hidden">
                     <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <Avatar className="w-10 h-10">
                              <AvatarImage src={refUser.photoURL} />
                              <AvatarFallback>{refUser.displayName?.[0]}</AvatarFallback>
                           </Avatar>
                           <div>
                              <p className="font-bold text-sm">{refUser.displayName}</p>
                              <p className="text-[10px] text-muted-foreground">
                                 انضم {refUser.createdAt?.seconds ? formatDistanceToNow(refUser.createdAt.seconds * 1000, { addSuffix: true, locale: ar }) : "قريباً"}
                              </p>
                           </div>
                        </div>
                        <Badge className="bg-green-500/10 text-green-500 border-none font-black">+25ن</Badge>
                     </CardContent>
                  </Card>
               ))}
            </div>
         ) : (
            <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-border px-8">
               <p className="text-muted-foreground font-bold italic">لم تجلب أي أصدقاء بعد. ابدأ بمشاركة رابطك لبناء أصلك الرقمي!</p>
            </div>
         )}
      </div>

      <div className="mt-12 p-8 bg-card border border-border rounded-3xl text-center space-y-4">
         <Zap className="mx-auto text-primary animate-pulse" size={32} />
         <h4 className="font-black text-lg">الخلاصة: شبكتك هي قوتك</h4>
         <p className="text-xs text-muted-foreground leading-relaxed">
            في NokTek، أنت لا تدعو أصدقاء فقط… أنت تبني أصلًا رقميًا يولّد لك الظهور والأرباح باستمرار. كلما توسعت شبكتك، تضاعفت النتائج.
         </p>
         <Button onClick={handleCopy} className="w-full h-12 rounded-xl font-bold gap-2">
            نسخ رابط مصدر دخلك <Copy size={16} />
         </Button>
      </div>
    </div>
  );
}
