
'use client';

import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function CreatorOnboardingPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-10 text-center">
      <div className="flex items-center gap-4 mb-10 text-right">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowRight />
          </Button>
        </Link>
        <h1 className="text-2xl font-black">وضع المبدع</h1>
      </div>
      
      <div className="bg-card border border-border p-20 rounded-3xl space-y-6">
         <Sparkles size={64} className="mx-auto text-orange-500 opacity-20" />
         <h2 className="text-xl font-bold">كن مؤثراً على NokTek</h2>
         <p className="text-muted-foreground text-sm">جاري تجهيز متطلبات تفعيل وضع المبدع. سيتم إطلاق الصفحة رسمياً في التحديث القادم.</p>
         <Link href="/creator/setup">
            <Button className="bg-orange-600 hover:bg-orange-700 font-bold px-8">بدأ التحقق من الشروط</Button>
         </Link>
      </div>
    </div>
  );
}
