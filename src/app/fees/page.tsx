"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Scale, ShieldCheck, Wallet, Megaphone, RefreshCw, Gavel, Zap, TrendingUp, Heart, MessageCircle, Share2, PlayCircle, Clock, AlertTriangle, Info, Sparkles, ShoppingBag } from "lucide-react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ECONOMIC_MODEL } from "@/lib/platform-service";

const REWARDS_TABLE = [
  { action: "نشر نقطة (منشور نصي/صورة)", reward: "5 نقاط", icon: "✨" },
  { action: "تعليق أساسي (3 كلمات)", reward: "2 نقطة", icon: "💬" },
  { action: "تعليق مميز (بالهاشتاق)", reward: "4 نقاط", icon: "🎯" },
  { action: "إعجاب (Like)", reward: "1 نقطة", icon: "❤️" },
  { action: "مشاركة المنشور (Share)", reward: "3 نقاط", icon: "🔄" },
  { action: "مشاهدة فيديو ترويجي (45ث)", reward: "15 نقطة", icon: "▶️" },
];

export default function FeesPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 text-right" dir="rtl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowRight className="rotate-180" />
          </Button>
        </Link>
        <h1 className="text-2xl font-black">الرسوم وجدول المكافآت</h1>
      </div>

      {/* Point Value Card */}
      <div className="bg-gradient-to-br from-primary to-purple-800 p-8 rounded-3xl text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2">1 نقطة = 0.01 درهم</h2>
          <p className="text-sm opacity-90 leading-relaxed max-w-sm">
            نحن المنصة العربية الوحيدة التي تمنح وقتك وتفاعلك قيمة نقدية حقيقية قابلة للسحب أو الشراء.
          </p>
        </div>
        <Zap className="absolute -bottom-4 -left-4 w-32 h-32 opacity-20 rotate-12" />
      </div>

      <div className="space-y-8">
        {/* Distribution Model Info */}
        <section className="bg-primary/5 border border-primary/20 p-6 rounded-3xl space-y-4">
           <h3 className="font-black flex items-center gap-2 text-primary">
              <Scale size={20} />
              نموذج توزيع الأرباح الذكي
           </h3>
           <p className="text-xs text-muted-foreground leading-relaxed">
             عند حدوث أي تفاعل على أي منشور (إعجاب، تعليق، مشاهدة)، يتم توليد نقاط من المسبح وتوزيعها كالتالي:
           </p>
           <div className="grid grid-cols-3 gap-2">
              <div className="bg-card p-3 rounded-2xl border border-border text-center">
                 <p className="text-lg font-black text-primary">{(ECONOMIC_MODEL.PUBLISHER_PERCENT * 100)}%</p>
                 <p className="text-[8px] font-bold">للناشر (المبدع)</p>
              </div>
              <div className="bg-card p-3 rounded-2xl border border-border text-center">
                 <p className="text-lg font-black text-green-500">{(ECONOMIC_MODEL.INTERACTOR_PERCENT * 100)}%</p>
                 <p className="text-[8px] font-bold">للمتفاعل (الجمهور)</p>
              </div>
              <div className="bg-card p-3 rounded-2xl border border-border text-center">
                 <p className="text-lg font-black text-orange-500">{(ECONOMIC_MODEL.PLATFORM_PERCENT * 100)}%</p>
                 <p className="text-[8px] font-bold">للمنصة (تشغيل)</p>
              </div>
           </div>
        </section>

        {/* Rewards Table */}
        <section className="space-y-4">
           <h3 className="text-lg font-black flex items-center gap-2 text-primary">
              <Sparkles size={20} />
              جدول القيم الإجمالية للتفاعلات
           </h3>
           <Card className="rounded-3xl overflow-hidden border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="text-right font-bold">النشاط</TableHead>
                    <TableHead className="text-left font-bold">القيمة الإجمالية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {REWARDS_TABLE.map((row, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell className="text-right font-medium">
                        <span className="ml-2">{row.icon}</span>
                        {row.action}
                      </TableCell>
                      <TableCell className="text-left font-black text-primary">{row.reward}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
           </Card>
           <p className="text-[9px] text-muted-foreground font-bold mr-2">* كافة القيم أعلاه تُقسم آلياً بين الناشر والمتفاعل والمنصة، ثم تُقسم حصة كل مستخدم بنسبة 51/49 كاش ومجمد.</p>
        </section>

        {/* Platform Fees */}
        <section className="space-y-4">
           <h3 className="text-lg font-black flex items-center gap-2 text-orange-500">
              <Gavel size={20} />
              رسوم عمليات المنصة (الحرق)
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="rounded-2xl border-border bg-card p-5 space-y-2">
                 <div className="flex justify-between items-center">
                    <h4 className="font-bold text-sm">السحب النقدي (Cash)</h4>
                    <span className="bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-lg text-xs font-black">7%</span>
                 </div>
                 <p className="text-[10px] text-muted-foreground leading-relaxed">تُطبق عند طلب تحويل رصيدك القابل للسحب إلى حسابك البنكي لتغطية رسوم التحويل وعملية حرق العملة.</p>
              </Card>
              <Card className="rounded-2xl border-border bg-card p-5 space-y-2">
                 <div className="flex justify-between items-center">
                    <h4 className="font-bold text-sm">تحويل المتجر (Shop)</h4>
                    <span className="bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded-lg text-xs font-black">7%</span>
                 </div>
                 <p className="text-[10px] text-muted-foreground leading-relaxed">تُطبق عند نقل النقاط من الرصيد القابل للسحب إلى محفظة المتجر الموحدة لدعم تجار المنصة.</p>
              </Card>
           </div>
        </section>
      </div>

      <div className="mt-12 p-6 bg-muted/30 rounded-3xl text-center flex flex-col items-center gap-2">
        <ShieldCheck className="text-muted-foreground opacity-40" size={32} />
        <p className="text-[10px] font-bold text-muted-foreground max-w-sm">
          تطبق كافة هذه الشروط والرسوم لضمان استمرارية ونمو اقتصاد NokTek الرقمي. نحن ملتزمون بالشفافية الكاملة وحماية حقوق المبدعين.
        </p>
      </div>

      <BottomNav />
    </div>
  );
}