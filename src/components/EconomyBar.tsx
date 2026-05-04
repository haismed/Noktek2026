
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { Gem, TrendingUp, Trophy } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import NotificationBell from "./NotificationBell";

export default function EconomyBar() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const unsubStats = onSnapshot(doc(db, "platform", "stats"), (doc) => {
      if (doc.exists()) setStats(doc.data());
    });
    return () => unsubStats();
  }, []);

  const pointValue = stats?.pointValueMAD || 0.01;
  const rewardPool = stats?.rewardPool ? (stats.rewardPool / 1000000).toFixed(1) : 10.7;
  const totalSupply = "22M";

  return (
    <TooltipProvider>
      <div className="sticky top-0 z-[100] h-14 w-full bg-gradient-to-r from-[#1A0B2E] to-black border-b border-white/5 shadow-xl backdrop-blur-md flex items-center px-2 md:px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-1 md:gap-8">
          
          <div className="flex items-center gap-2 md:gap-4">
             <NotificationBell />
             <div className="h-6 w-[1px] bg-white/10 hidden xs:block" />
             <div className="flex items-center gap-1 whitespace-nowrap">
               <Gem size={14} className="text-white opacity-80" />
               <span className="text-[10px] md:text-[13px] font-bold text-white uppercase">
                 <span className="hidden xs:inline">المخزون: </span><span className="font-black">{totalSupply}</span>
               </span>
             </div>
          </div>

          <div className="flex items-center gap-2 md:gap-8">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 whitespace-nowrap cursor-help group bg-green-500/5 px-2 py-1 rounded-lg border border-green-500/10">
                  <TrendingUp size={14} className="text-[#4ADE80] group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] md:text-[13px] font-black text-[#4ADE80]">
                    {pointValue} <span className="text-[8px] font-bold">د.م.</span>
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-card border-border text-foreground p-3 rounded-xl shadow-2xl max-w-[200px] text-right">
                <p className="text-xs leading-relaxed font-bold">قيمة النقطة الحالية ترتفع مع نمو المنصة 📈</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 md:gap-1.5 whitespace-nowrap cursor-help bg-gradient-to-r from-yellow-500/10 to-amber-500/10 px-2 md:px-3 py-1 rounded-full border border-yellow-500/20 group relative overflow-hidden">
                  <Trophy size={14} className="text-yellow-400 group-hover:rotate-12 transition-transform" />
                  <span className="text-[10px] md:text-[13px] font-black bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent">
                    المسبح: {rewardPool}M
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-card border-border text-foreground p-3 rounded-xl shadow-2xl max-w-[250px] text-right">
                <p className="text-xs leading-relaxed font-bold">صندوق المكافآت المتبقي لتوزيعه على المبدعين والجمهور 🏆</p>
              </TooltipContent>
            </Tooltip>
          </div>

        </div>
      </div>
    </TooltipProvider>
  );
}
