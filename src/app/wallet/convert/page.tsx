
"use client";

import { useAuth } from "@/context/auth-context";
import { useState } from "react";
import { convertLockedToAd } from "@/lib/wallet-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, RefreshCw, Lock, AlertCircle, Info, ShieldCheck, Loader2, Gavel, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function ConvertWalletPage() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user || !userData) return null;

  // استخراج بيانات المراحل
  const limits = userData.conversionLimits || { 
    currentStage: 1, 
    stageStartBalance: userData.lockedPoints || 0, 
    conversionsInStage: 0 
  };

  const currentConversions = limits.conversionsInStage || 0;
  const stageStart = limits.stageStartBalance || (userData.lockedPoints || 0);
  const maxAllowed = Math.floor(stageStart * 0.49);
  const remainingInStage = 3 - currentConversions;

  const handleConvert = async () => {
    const points = Number(amount);
    if (!points || points <= 0) return;

    if (points > maxAllowed) {
      toast({ variant: "destructive", title: "تجاوزت الحد", description: `أقصى مبلغ مسموح به هو ${maxAllowed} نقطة.` });
      return;
    }

    setLoading(true);
    try {
      const res = await convertLockedToAd(user.uid, points);
      toast({ 
        title: "تم التحويل بنجاح! 🚀", 
        description: `حصلت على ${res.net} نقطة إعلانية (شاملة بونص ${res.bonus}ن).` 
      });
      router.push("/profile");
    } catch (e: any) {
      toast({ variant: "destructive", title: "فشل التحويل", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const bonusAmount = Math.floor(Number(amount) * 0.10);
  const totalExpected = Number(amount) + bonusAmount;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 text-right" dir="rtl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowRight className="rotate-180" />
          </Button>
        </Link>
        <h1 className="text-2xl font-black">تحويل من المجمد</h1>
      </div>

      <div className="space-y-6">
        {/* معلومات المرحلة */}
        <Card className="rounded-3xl border-primary/20 bg-primary/5 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Lock className="text-primary" size={20} />
              تحويلات المرحلة {limits.currentStage}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-card p-4 rounded-2xl border border-border">
               <p className="text-xs text-muted-foreground mb-1 font-bold">رصيد بداية المرحلة:</p>
               <p className="text-xl font-black text-primary">{stageStart.toLocaleString()} <span className="text-xs">نقطة</span></p>
               <div className="h-px bg-border my-3" />
               <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-muted-foreground">الحد الأقصى (49%):</span>
                  <span className="text-orange-500">{maxAllowed.toLocaleString()} ن</span>
               </div>
            </div>

            <div className="space-y-3">
               <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-bold">العمليات المتبقية:</span>
                  <span className="text-xs font-black text-primary">{remainingInStage} من 3</span>
               </div>
               <div className="flex gap-2">
                  {[1, 2, 3].map((slot) => (
                    <div 
                      key={slot} 
                      className={cn(
                        "h-3 flex-1 rounded-full transition-all duration-500",
                        slot <= currentConversions ? "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" : "bg-muted border border-border"
                      )} 
                    />
                  ))}
               </div>
            </div>
          </CardContent>
        </Card>

        {/* نموذج التحويل */}
        <Card className="rounded-3xl border-border bg-card shadow-xl">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <label className="text-sm font-bold mr-1">كم نقطة تود تحويلها للتعزيز؟</label>
              <div className="relative">
                <Input 
                  type="number" 
                  max={maxAllowed}
                  placeholder={`أقصى مبلغ ${maxAllowed}`}
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-16 rounded-2xl text-3xl font-black text-center border-2 border-primary/30 focus:border-primary transition-all"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black">
                  49% MAX
                </div>
              </div>
              <p className="text-[10px] text-center text-muted-foreground font-bold">
                رصيدك المجمد الحالي: {userData.lockedPoints?.toFixed(0)} نقطة
              </p>
            </div>

            {Number(amount) > 0 && (
              <div className="bg-green-500/5 border border-green-500/20 p-4 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-muted-foreground">البونص التشجيعي (10%):</span>
                  <span className="text-green-600 flex items-center gap-1">+{bonusAmount} <Sparkles size={12}/></span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center">
                  <span className="font-black text-lg">ستحصل على:</span>
                  <span className="text-2xl font-black text-primary">{totalExpected} <span className="text-xs">نقطة إعلانية</span></span>
                </div>
              </div>
            )}

            <Button 
              onClick={handleConvert} 
              disabled={loading || !amount || Number(amount) <= 0 || Number(amount) > maxAllowed || remainingInStage === 0}
              className="w-full h-16 rounded-2xl text-xl font-black gap-3 shadow-lg group"
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                <>
                  تحويل للتعزيز الآن
                  <TrendingUp size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </>
              )}
            </Button>

            {remainingInStage === 0 && (
              <div className="flex items-center gap-2 justify-center text-amber-500 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                <AlertCircle size={16} />
                <p className="text-[10px] font-black">استنفذت تحويلات هذه المرحلة. تفاعل واربح لبدء مرحلة جديدة!</p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
               <div className="flex items-start gap-2 text-[10px] text-muted-foreground bg-muted/30 p-3 rounded-xl">
                  <Info size={14} className="shrink-0 text-primary" />
                  <p className="leading-relaxed">
                    الرصيد الإعلاني يستخدم لتعزيز منشوراتك ومضاعفة أرباح جمهورك، وهو <span className="text-primary font-black">غير قابل للسحب كاش</span>.
                  </p>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
