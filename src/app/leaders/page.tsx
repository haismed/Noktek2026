
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Crown, Medal, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LeadersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [leaders, setLeaders] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("totalPoints", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLeaders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0: return "bg-yellow-500/10 border-yellow-500/20 shadow-lg shadow-yellow-500/5";
      case 1: return "bg-gray-400/10 border-gray-400/20";
      case 2: return "bg-amber-600/10 border-amber-600/20";
      default: return "bg-card border-border";
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown className="text-yellow-500 w-8 h-8" />;
      case 1: return <Medal className="text-gray-400 w-7 h-7" />;
      case 2: return <Medal className="text-amber-600 w-6 h-6" />;
      default: return <span className="text-xl font-black text-muted-foreground">#{index + 1}</span>;
    }
  };

  if (loading) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 text-right">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowRight className="rotate-180" />
          </Button>
        </Link>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Trophy className="text-yellow-500" />
          المتصدرون على NokTek
        </h1>
      </div>

      <div className="pulse-card rounded-3xl p-6 text-white mb-8 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-sm font-bold opacity-90">تفاعل أكثر، اجمع نقاطاً أكثر، وكن في الصدارة!</p>
          <h2 className="text-3xl font-black mt-2 text-white">نخبة المجتمع</h2>
        </div>
        <Zap className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 rotate-12" />
      </div>

      <div className="space-y-4">
        {leaders.map((leader, index) => (
          <Link 
            key={leader.id} 
            href={`/profile/${leader.id}`}
            className={cn(
              "flex items-center justify-between p-4 rounded-2xl border transition-all hover:scale-[1.02] hover:bg-muted/5 group cursor-pointer",
              getRankStyle(index)
            )}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 flex justify-center items-center">
                {getRankIcon(index)}
              </div>
              <Avatar className="w-14 h-14 border-2 border-primary/20 group-hover:border-primary/50 transition-colors">
                <AvatarImage src={leader.photoURL} alt={leader.displayName} />
                <AvatarFallback>{leader.displayName?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-black text-lg group-hover:text-primary transition-colors">{leader.displayName}</p>
                <p className="text-[10px] text-muted-foreground font-bold">عضو منذ {leader.createdAt?.seconds ? new Date(leader.createdAt.seconds * 1000).toLocaleDateString('ar-SA') : "قريباً"}</p>
              </div>
            </div>
            <div className="text-left bg-background/50 px-4 py-2 rounded-xl border border-border group-hover:border-primary/30 transition-colors">
              <span className="text-2xl font-black text-primary">{(leader.totalPoints || 0).toFixed(1)}</span>
              <p className="text-[10px] font-bold text-muted-foreground">نقطة</p>
            </div>
          </Link>
        ))}
        {leaders.length === 0 && (
          <p className="text-center py-20 text-muted-foreground italic">جاري البحث عن العمالقة...</p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
