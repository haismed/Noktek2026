
"use client";

import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight, Gavel, Scale, AlertTriangle, Info, RefreshCw, Zap } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 text-right" dir="rtl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowRight className="rotate-180" />
          </Button>
        </Link>
        <h1 className="text-2xl font-black flex items-center gap-2 text-primary">
          <Gavel />
          شروط الاستخدام
        </h1>
      </div>

      <div className="space-y-6">
        <section className="bg-primary/5 border border-primary/20 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4 text-primary">
            <Zap size={24} />
            <h2 className="text-xl font-bold">1. النظام الاقتصادي (51/49)</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            تعتمد NokTek نظاماً اقتصادياً فريداً لضمان استدامة المنصة. يتم تقسيم كافة الأرباح والمكافآت بنسبة **51%** تذهب للرصيد القابل للسحب (Cashable) و **49%** تذهب للرصيد المجمد (Locked) الذي يرحل للدورات القادمة لرفع قيمة النقطة تدريجياً.
          </p>
        </section>

        <section className="bg-card border border-border p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4 text-secondary">
            <RefreshCw size={24} />
            <h2 className="text-xl font-bold">2. الدورات الاقتصادية والسحب</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            يتم تحديد "الدورة الاقتصادية" باستهلاك كامل نقاط مسبح المكافآت الحالي. يفتح باب السحب النقدي **فقط** عند نهاية الدورة. يحق للمنصة تعديل سعر النقطة عند بداية كل دورة جديدة بناءً على العرض والطلب وحجم النمو.
          </p>
        </section>

        <section className="bg-card border border-border p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4 text-primary">
            <Scale size={24} />
            <h2 className="text-xl font-bold">3. حقوق الملكية الفكرية</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            يمنع منعاً باتاً نشر محتوى مسروق أو منسوب لغير صاحبه. أي بلاغ مثبت عن انتهاك حقوق الملكية سيؤدي إلى حذف المنشور فوراً وحرمان الناشر من مكافآت ذلك المنشور، وفي حال التكرار قد يتم تجميد الحساب نهائياً.
          </p>
        </section>

        <section className="bg-destructive/10 border border-destructive/20 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4 text-destructive">
            <AlertTriangle size={24} />
            <h2 className="text-xl font-bold">4. سياسة الحماية من الغش</h2>
          </div>
          <p className="text-sm text-destructive font-medium leading-relaxed">
            استخدام البوتات، برامج التفاعل الآلي، أو محاولة استغلال الثغرات البرمجية للحصول على نقاط غير مشروعة سيؤدي إلى تصفير أرصدة الحساب فوراً وحظره من المنصة. نحن نستخدم تقنيات متطورة لرصد الأنماط غير البشرية في التفاعل.
          </p>
        </section>

        <section className="bg-card border border-border p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4 text-blue-500">
            <Info size={24} />
            <h2 className="text-xl font-bold">5. رسوم الخدمة والحرق</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            تتقاضى المنصة رسوم خدمة بنسبة **7%** عند السحب النقدي أو التحويل الداخلي للمتجر. هذه الرسوم تُستخدم جزئياً لتغطية تكاليف التشغيل وجزئياً كعملية "حرق" لرفع ندرة وقيمة النقاط المتبقية في السوق.
          </p>
        </section>

        <div className="text-center py-8">
          <p className="text-xs text-muted-foreground font-bold">آخر تحديث للشروط: أبريل 2026</p>
          <p className="text-xs text-muted-foreground mt-2 italic">نحن نطور القوانين باستمرار لحماية حقوقك وبناء اقتصاد عادل للجميع.</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
