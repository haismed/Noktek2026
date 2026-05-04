
"use client";

import { useAuth } from "@/context/auth-context";
import { useState, useEffect } from "react";
import { withdrawPoints } from "@/lib/wallet-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowRight, Wallet, AlertCircle, ShieldCheck, Loader2, Landmark, Gavel, Building2, UserCircle, CreditCard, Lock } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import SystemInfoBanner from "@/components/SystemInfoBanner";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function WithdrawWalletPage() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [platformStats, setPlatformStats] = useState<any>(null);
  
  // Bank Form State
  const [bankName, setBankName] = useState(userData?.bankInfo?.bankName || "");
  const [accountName, setAccountName] = useState(userData?.bankInfo?.accountName || "");
  const [rib, setRib] = useState(userData?.bankInfo?.rib || "");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "platform", "stats"), (doc) => {
      if (doc.exists()) setPlatformStats(doc.data());
    });
    return () => unsub();
  }, []);

  if (!user || !userData) return null;

  const handleWithdraw = async () => {
    const points = Number(amount);
    if (!points || points < 100) {
      toast({ variant: "destructive", title: "خطأ", description: "الحد الأدنى للسحب 100 نقطة." });
      return;
    }
    if (!bankName || !accountName || !rib) {
      toast({ variant: "destructive", title: "بيانات ناقصة", description: "يرجى إكمال معلومات الحساب البنكي." });
      return;
    }

    setLoading(true);
    try {
      await withdrawPoints(user.uid, points, { bankName, accountName, rib });
      toast({ title: "تم إرسال طلب السحب بنجاح ✅", description: "سيتم مراجعة بياناتك والتحويل خلال 48 ساعة." });
      router.push("/profile");
    } catch (e: any) {
      toast({ variant: "destructive", title: "فشل السحب", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const pointValue = platformStats?.pointValueMAD || 0.01;
  const netPoints = Math.floor(Number(amount) * 0.93);
  const netMAD = (netPoints * pointValue).toFixed(2);
  const feeMAD = (Number(amount) * 0.07 * pointValue).toFixed(2);

  const isWithdrawalOpen = platformStats?.withdrawalOpen;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 text-right" dir="rtl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowRight className="rotate-180" />
          </Button>
        </Link>
        <h1 className="text-2xl font-black">سحب الأرباح النقدية</h1>
      </div>

      <SystemInfoBanner />

      {!isWithdrawalOpen ? (
        <Card className="rounded-3xl border-amber-500/30 bg-amber-500/5 mb-8 overflow-hidden">
          <CardContent className="p-8 text-center space-y-4">
             <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto">
                <Lock className="text-amber-600" size={32} />
             </div>
             <h2 className="text-xl font-black text-amber-700">باب السحب مغلق حالياً</h2>
             <p className="text-sm text-amber-600 leading-relaxed font-bold">
                يفتح باب السحب تلقائياً عند نهاية الدورة الاقتصادية (بمجرد استهلاك مسبح المكافآت).
                نقاطك القابلة للسحب محفوظة وآمنة تماماً.
             </p>
             <div className="pt-4">
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">تفاعل أكثر لإنهاء الدورة بشكل أسرع 🚀</p>
             </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="pulse-card rounded-3xl p-8 text-white mb-2 relative overflow-hidden">
            <div className="relative z-10">
              <Landmark className="mb-4 w-10 h-10 opacity-80" />
              <h2 className="text-3xl font-black mb-2">باب السحب مفتوح! 🎊</h2>
              <p className="text-sm opacity-90 leading-relaxed">
                انتهت الدورة الاقتصادية بنجاح. يمكنك الآن تحويل نقاطك (51%) إلى مبالغ نقدية في حسابك البنكي.
              </p>
            </div>
          </div>

          <Card className="rounded-3xl border-border bg-card shadow-xl overflow-hidden">
            <div className="bg-muted/30 p-4 border-b border-border">
               <h3 className="font-black text-sm flex items-center gap-2">
                  <Building2 size={16} className="text-primary" />
                  معلومات الحساب البنكي
               </h3>
            </div>
            <CardContent className="p-6 space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="mr-1">اسم البنك</Label>
                    <Input placeholder="مثال: التجاري وفا بنك" value={bankName} onChange={e => setBankName(e.target.value)} className="rounded-xl h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label className="mr-1">اسم صاحب الحساب</Label>
                    <Input placeholder="الاسم الكامل كما في البنك" value={accountName} onChange={e => setAccountName(e.target.value)} className="rounded-xl h-12" />
                  </div>
               </div>
               <div className="space-y-2">
                  <Label className="mr-1">رقم الحساب (RIB - 24 رقم)</Label>
                  <Input placeholder="000 000 0000000000000000 00" value={rib} onChange={e => setRib(e.target.value)} className="rounded-xl h-14 font-mono text-center tracking-widest" maxLength={24} />
                  <p className="text-[9px] text-muted-foreground mr-1">* تأكد من صحة رقم الـ RIB لتجنب تأخر التحويل.</p>
               </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border bg-card shadow-xl overflow-hidden">
            <div className="bg-muted/30 p-4 border-b border-border">
               <h3 className="font-black text-sm flex items-center gap-2">
                  <Wallet size={16} className="text-green-600" />
                  المبلغ والرسوم
               </h3>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold mr-2 text-muted-foreground">النقاط المراد سحبها</label>
                <div className="relative">
                   <Input 
                    type="number" 
                    placeholder="100" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-16 rounded-2xl text-3xl font-black text-center border-2 border-primary/20 focus:border-primary transition-all"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-green-500/10 text-green-600 px-3 py-1 rounded-full text-[10px] font-black">
                     MIN 100
                  </div>
                </div>
                <p className="text-[10px] text-center text-muted-foreground font-bold">
                  رصيدك المتاح حالياً: <span className="text-green-600 font-black">{userData.withdrawablePoints?.toFixed(1)}</span> نقطة
                </p>
              </div>

              <div className="bg-green-500/5 border border-green-500/20 p-5 rounded-3xl space-y-3">
                <div className="flex justify-between text-sm flex-row-reverse">
                  <span className="text-muted-foreground">القيمة الإجمالية:</span>
                  <span className="font-bold">{(Number(amount) * pointValue).toFixed(2)} د.م.</span>
                </div>
                <div className="flex justify-between text-sm flex-row-reverse text-destructive">
                  <span className="flex items-center gap-1 font-bold">رسوم المنصة (7%): <Gavel size={12}/></span>
                  <span className="font-black">-{feeMAD} د.م.</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center flex-row-reverse">
                  <span className="font-black text-lg">الصافي الذي ستستلمه:</span>
                  <span className="text-3xl font-black text-green-600">{netMAD} <span className="text-xs">درهم</span></span>
                </div>
              </div>

              <Button 
                onClick={handleWithdraw} 
                disabled={loading || !amount || Number(amount) < 100 || !rib}
                className="w-full h-16 rounded-2xl text-xl font-black bg-green-600 hover:bg-green-700 gap-3 shadow-lg shadow-green-500/20"
              >
                {loading ? <Loader2 className="animate-spin" /> : (
                  <>
                    تأكيد طلب السحب البنكي
                    <CreditCard size={24} />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-8 p-6 bg-muted/20 rounded-3xl text-center space-y-2">
        <ShieldCheck className="mx-auto text-muted-foreground opacity-40 mb-1" size={32} />
        <p className="text-[10px] font-bold text-muted-foreground leading-relaxed">
          نظام NokTek يضمن وصول أرباحك بأمان. تتم معالجة الطلبات يدوياً في هذه المرحلة لضمان أعلى درجات التدقيق.
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
