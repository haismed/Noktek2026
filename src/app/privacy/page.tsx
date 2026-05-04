
"use client";

import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight, Eye, Lock, Database, Globe, Fingerprint } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 text-right" dir="rtl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowRight className="rotate-180" />
          </Button>
        </Link>
        <h1 className="text-2xl font-black flex items-center gap-2 text-primary">
          <Lock />
          سياسة الخصوصية
        </h1>
      </div>

      <div className="space-y-6">
        <div className="bg-primary/5 border border-primary/20 p-6 rounded-3xl">
          <p className="text-sm text-muted-foreground leading-relaxed">
            في NokTek، نعتبر خصوصيتك أولوية قصوى. نحن ملتزمون بحماية بياناتك الشخصية والمالية باستخدام أعلى معايير التشفير والتقنيات الحديثة.
          </p>
        </div>

        <section className="bg-card border border-border p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-3 text-secondary">
            <Fingerprint size={24} />
            <h2 className="text-xl font-bold">1. بصمة الجهاز والأمان</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            نستخدم تقنية "بصمة الجهاز" (Device Fingerprinting) لمنع إنشاء حسابات متعددة من نفس الجهاز. هذا الإجراء ضروري لضمان عدالة توزيع المكافآت وحماية "مسبح النقاط" من التلاعب والاحتيال. لا نقوم بمشاركة هذه البصمة مع أي جهة خارجية.
          </p>
        </section>

        <section className="bg-card border border-border p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <Database size={24} />
            <h2 className="text-xl font-bold">2. البيانات التي نجمعها</h2>
          </div>
          <ul className="space-y-3 mr-4 text-sm text-muted-foreground">
            <li className="list-disc">المعلومات الشخصية: الاسم المستعار، البريد الإلكتروني، وصورة الملف الشخصي.</li>
            <li className="list-disc">بيانات المحفظة: تاريخ العمليات، الأرصدة القابلة للسحب، والمجمدة.</li>
            <li className="list-disc">المعلومات البنكية: رقم الـ RIB واسم البنك (تُطلب فقط عند طلب السحب النقدي).</li>
            <li className="list-disc">نشاط التفاعل: المنشورات التي أعجبت بها، التعليقات، ومدة المشاهدة.</li>
          </ul>
        </section>

        <section className="bg-card border border-border p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-3 text-green-500">
            <ShieldCheck size={24} />
            <h2 className="text-xl font-bold">3. حماية البيانات المالية</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            كافة البيانات المتعلقة بمعاملاتك المالية مشفرة بالكامل. لا يمكن لموظفي المنصة الوصول إلى تفاصيل حسابك البنكي إلا لأغراض معالجة طلبات السحب اليدوية في نهاية كل دورة اقتصادية.
          </p>
        </section>

        <section className="bg-card border border-border p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-3 text-orange-500">
            <Globe size={24} />
            <h2 className="text-xl font-bold">4. الإعلانات والجهات الخارجية</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            عند تفاعلك مع إعلان ممول، قد يتم تزويد المعلن بإحصائيات عامة (غير شخصية) مثل عدد المشاهدات، منطقة الجمهور الجغرافية، ومتوسط التفاعل. نحن لا نبيع بياناتك الشخصية المباشرة للمعلنين.
          </p>
        </section>

        <div className="p-6 bg-muted/20 rounded-3xl text-center">
          <p className="text-[10px] text-muted-foreground font-bold italic">
            باستخدامك لمنصة NokTek، أنت توافق على جمع ومعالجة بياناتك وفقاً لهذه السياسة لضمان أفضل تجربة مستخدم وأعلى درجات الأمان الاقتصادي.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
