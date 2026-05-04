"use client";

import { useAuth } from "@/context/auth-context";
import { useState, useEffect } from "react";
import { buyPoints, checkShopEligibility } from "@/lib/wallet-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowRight, ShoppingCart, Lock, Sparkles, Loader2, Gift, 
  Beaker, ShieldCheck, Rocket, Zap, Wallet, Info, TrendingUp 
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { convertToAdBalance } from "@/lib/boost-service";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function PointShopPage() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [madAmount, setMadAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [convAmount, setConvAmount] = useState("");
  const [convLoading, setConvLoading] = useState(false);
  const [platformStats, setPlatformStats] = useState<any>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "platform", "stats"), (doc) => {
      if (doc.exists()) setPlatformStats(doc.data());
    });
    return () => unsub();
  }, []);

  if (!user || !userData) return null;

  const currentPrice = platformStats?.pointValueMAD || 0.01;

  const handleBuy = async () => {
    const amount = Number(madAmount);
    if (!amount || amount < 10) {
      toast({ variant: "destructive", title: "خطأ", description: "الحد الأدنى للشراء هو 10 دراهم حسب القوانين." });
      return;
    }
    setLoading(true);
    try {
      const res = await buyPoints(user.uid, amount);
      toast({ title: "تم الشراء بنجاح", description: `تمت إضافة ${res.points} نقطة لرصيدك الإعلاني.` });
      router.push("/profile");
    } catch (e: any) {
      toast({ variant: "destructive", title: "فشل العملية", description: e.message });
    } finally { setLoading(false); }
  };

  const handleConvert = async () => {
    const amount = Number(convAmount);
    if (!amount || amount <= 0) return;
    setConvLoading(true);
    try {
      await convertToAdBalance(user.uid, amount);
      toast({ title: "تم التحويل بنجاح", description: "رصيدك الإعلاني جاهز للاستخدام." });
      setConvAmount("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ", description: e.message });
    } finally { setConvLoading(false); }
  };

  // حساب نسبة الاستهلاك الحالية للمستخدم
  const purchased = userData.purchasedPointsThisCycle || 0;
  const spent = userData.spentPointsThisCycle || 0;
  const consumptionPercent = purchased > 0 ? (spent / purchased) * 100 : 0;
  const isEligibleForBonus = purchased > 0 && consumptionPercent >= 51;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 text-right" dir="rtl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowRight className="rotate-180" />
          </Button>
        </Link>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <ShoppingCart className="text-primary" />
          متجر النقاط الذكي
        </h1>
      </div>

      {/* Bonus Rule Card */}
      <Card className="mb-8 rounded-3xl border-primary/20 bg-gradient-to-br from-primary/10 to-blue-600/5 overflow-hidden shadow-lg">
        <CardContent className="p-6">
           <div className="flex items-start gap-4 flex-row-reverse">
              <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center shrink-0">
                 <TrendingUp className="text-primary" size={32} />
              </div>
              <div className="flex-1 text-right">
                 <h3 className="text-lg font-black text-primary mb-1">ميزة الاستثمار (عمولة 5%) 📈</h3>
                 <p className="text-xs text-muted-foreground leading-relaxed">
                   اشترِ نقاطك الآن واستهلك أكثر من <span className="text-primary font-black">51%</span> منها في الإعلانات أو المتجر، واحصل على <span className="text-green-500 font-black">5% كاش باك</span> من القيمة المالية تحول لنقاط في الدورة القادمة بسعرها الجديد!
                 </p>
              </div>
           </div>
           
           {purchased > 0 && (
             <div className="mt-6 space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase">
                   <span className={isEligibleForBonus ? "text-green-500" : "text-muted-foreground"}>
                     {isEligibleForBonus ? "✅ مؤهل للعمولة" : `استهلكت ${consumptionPercent.toFixed(0)}% (باقي ${Math.max(0, 51 - consumptionPercent).toFixed(0)}%)`}
                   </span>
                   <span className="text-primary">استهلاك الدورة: {spent}/{purchased} ن</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                   <div 
                    className={`h-full transition-all duration-500 ${isEligibleForBonus ? 'bg-green-500' : 'bg-primary'}`} 
                    style={{ width: `${Math.min(100, consumptionPercent)}%` }} 
                   />
                </div>
             </div>
           )}
        </CardContent>
      </Card>

      <div className="space-y-8">
         <div className="bg-gradient-to-br from-orange-500 to-red-600 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
               <Badge className="bg-white/20 text-white border-none mb-4 flex items-center gap-1 w-fit"><Rocket size={12}/> رصيد التعزيز والبيع</Badge>
               <h2 className="text-3xl font-black mb-2">اشحن رصيدك الإعلاني</h2>
               <p className="text-sm opacity-90">سعر النقطة الحالي: <span className="font-black text-yellow-400">{currentPrice} د.م.</span></p>
            </div>
            <Zap className="absolute -bottom-4 -left-4 w-32 h-32 opacity-20 rotate-12" />
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-3xl border-border bg-card shadow-sm">
               <CardHeader><CardTitle className="text-lg font-black flex items-center gap-2 justify-end">شراء باقات <Wallet className="text-primary"/></CardTitle></CardHeader>
               <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-2">
                     {[
                       { mad: 10, label: 'باقة المبدع' },
                       { mad: 50, label: 'باقة النجم' },
                       { mad: 100, label: 'باقة الأساطير' }
                     ].map(b => (
                        <button key={b.mad} onClick={() => setMadAmount(b.mad.toString())} className="flex justify-between items-center p-4 rounded-xl border border-border hover:border-primary transition-all group">
                           <span className="font-black text-primary group-hover:scale-110 transition-transform">{Math.floor(b.mad / currentPrice)} ن</span>
                           <span className="text-xs font-bold">{b.label} ({b.mad} د.م.)</span>
                        </button>
                     ))}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground mr-1">مبلغ مخصص (درهم مغربي):</label>
                    <Input type="number" placeholder="أقل مبلغ 10" value={madAmount} onChange={e => setMadAmount(e.target.value)} className="h-14 rounded-xl text-center text-xl font-black" />
                  </div>
                  <Button onClick={handleBuy} disabled={loading || !madAmount || Number(madAmount) < 10} className="w-full h-14 rounded-2xl font-black gap-2 shadow-lg shadow-primary/20">
                     {loading ? <Loader2 className="animate-spin" /> : <>شراء الآن <ShoppingCart size={20}/></>}
                  </Button>
               </CardContent>
            </Card>

            <Card className="rounded-3xl border-border bg-card shadow-sm">
               <CardHeader><CardTitle className="text-lg font-black flex items-center gap-2 justify-end">تحويل من المجمد <Lock className="text-orange-500"/></CardTitle></CardHeader>
               <CardContent className="space-y-4">
                  <p className="text-[10px] text-muted-foreground font-bold leading-relaxed">حوّل نقاطك من المحفظة المغلقة إلى الرصيد الإعلاني لتعزيز منشوراتك مجاناً. (ملاحظة: التحويل الداخلي لا يشمله كاش باك الـ 5%)</p>
                  <div className="bg-orange-500/5 p-4 rounded-2xl text-center mb-4 border border-orange-500/10">
                     <p className="text-[10px] text-orange-600 font-bold mb-1">رصيدك المجمد الحالي:</p>
                     <p className="text-2xl font-black text-orange-600">{userData.lockedPoints?.toFixed(0)} <span className="text-xs">ن</span></p>
                  </div>
                  <Input type="number" placeholder="كم نقطة تود تحويلها؟" value={convAmount} onChange={e => setConvAmount(e.target.value)} className="h-14 rounded-xl text-center text-xl font-black" />
                  <Button onClick={handleConvert} disabled={convLoading || !convAmount} variant="outline" className="w-full h-14 rounded-2xl font-black gap-2 border-orange-500 text-orange-600 hover:bg-orange-500/5">
                     {convLoading ? <Loader2 className="animate-spin" /> : <>تحويل للتعزيز <Rocket size={20}/></>}
                  </Button>
               </CardContent>
            </Card>
         </div>

         <div className="bg-primary/5 p-6 rounded-3xl border border-dashed border-primary/20 text-center">
            <p className="text-xs font-bold text-muted-foreground leading-relaxed">
               تنبيه: النقاط الإعلانية <span className="text-primary">غير قابلة للسحب النقدي</span>. تُستخدم حصراً لتعزيز المنشورات، الإعلانات، أو الشراء من المتجر. يتم تطبيق قوانين الدولة (المغرب) في معالجة المدفوعات.
            </p>
         </div>
      </div>
    </div>
  );
}
