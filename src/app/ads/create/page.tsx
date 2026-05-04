
'use client';

import { Button } from "@/components/ui/button";
import { ArrowRight, Megaphone } from "lucide-react";
import Link from "next/link";

export default function AdsCreatePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-10 text-center">
      <div className="flex items-center gap-4 mb-10 text-right">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowRight />
          </Button>
        </Link>
        <h1 className="text-2xl font-black">إنشاء حملة إعلانية</h1>
      </div>
      
      <div className="bg-card border border-border p-20 rounded-3xl space-y-6">
         <Megaphone size={64} className="mx-auto text-blue-500 opacity-20" />
         <h2 className="text-xl font-bold">أطلق حملتك الإعلانية</h2>
         <p className="text-muted-foreground text-sm">استخدم نقاطك للوصول إلى جمهور أكبر. يمكنك البدء الآن عبر نظام الإعلانات الأساسي.</p>
         <Link href="/advertise">
            <Button className="bg-blue-600 hover:bg-blue-700 font-bold px-8">إنشاء إعلان جديد</Button>
         </Link>
      </div>
    </div>
  );
}
