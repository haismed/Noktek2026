'use client';

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Zap, Info, ArrowUpRight, Sparkles, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SystemInfoBanner() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "platform", "stats"), (docSnap) => {
      if (docSnap.exists()) {
        setStats(docSnap.data());
      }
    });
    return () => unsub();
  }, []);

  const pointValue = stats?.pointValueMAD || 0.01;
  const distributed = stats?.distributedRewards || 0;
  const poolSize = stats?.rewardPool || (22000000 * 0.49);
  const consumedPercent = Math.min(100, (distributed / poolSize) * 100);

  // Circular Progress calculations
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (consumedPercent / 100) * circumference;

  return (
    <Card className="rounded-[2.5rem] border-none bg-gradient-to-br from-[#1A0B2E] via-[#0D051A] to-black border border-white/5 overflow-hidden mb-8 shadow-2xl group relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
      
      <CardContent className="p-6 relative">
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          
          {/* Circular Indicator */}
          <div className="relative flex items-center justify-center shrink-0">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-white/5"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={circumference}
                style={{ strokeDashoffset: offset }}
                strokeLinecap="round"
                className="text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.8)] transition-all duration-[2000ms] ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-black text-white">{consumedPercent.toFixed(1)}%</span>
              <span className="text-[7px] font-bold text-primary uppercase tracking-widest">مستهلك</span>
            </div>
          </div>
          
          <div className="flex-1 text-right space-y-2">
            <div className="flex items-center justify-between flex-row-reverse">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tighter">اقتصاد NokTek الحي</h3>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1.5 py-1 px-3 rounded-full">
                 <ShieldCheck size={12} />
                 <span className="text-[10px] font-black">نظام آمن 100%</span>
              </Badge>
            </div>

            <p className="text-xs text-white/60 leading-relaxed font-medium max-w-md">
              خوارزمية رفع القيمة مفعلة. سعر النقطة يزداد تلقائياً كلما زاد استهلاك مسبح المكافآت لضمان ندرة الأصول الرقمية.
            </p>

            <div className="flex items-center justify-end gap-3 pt-1">
               <div className="flex items-center gap-1 text-[10px] font-black text-primary">
                  <Sparkles size={12}/> استثمر في شبكتك الاجتماعية
               </div>
               <div className="w-1 h-1 bg-white/20 rounded-full" />
               <div className="flex items-center gap-1 text-[10px] font-black text-blue-400">
                  <TrendingUp size={12}/> {stats?.activeUsers || 450} مستخدم نشط
               </div>
            </div>
          </div>

          {/* Current Value Display - Enhanced */}
          <div className="bg-gradient-to-b from-white/10 to-white/5 border border-white/20 p-5 rounded-[2rem] text-center min-w-[140px] backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] group-hover:border-primary/50 transition-all duration-500 scale-105">
            <p className="text-[9px] font-bold text-white/50 mb-2 uppercase tracking-widest">القيمة الحالية (درهم)</p>
            <p className="text-4xl font-black text-primary leading-none tracking-tighter drop-shadow-[0_0_10px_rgba(var(--primary),0.5)]">{pointValue}</p>
            <div className="mt-3 flex items-center justify-center gap-1 text-[10px] font-black text-green-400 bg-green-500/20 py-1.5 px-3 rounded-full">
              <ArrowUpRight size={12} /> صعود مستمر
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}