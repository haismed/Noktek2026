"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Crown, Medal, UserCheck } from "lucide-react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";

export default function Leaderboard() {
  const [creators, setCreators] = useState<any[]>([]);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    // التحقق من حالة تسجيل الدخول قبل محاولة القراءة من Firestore
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setIsAllowed(!!user);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isAllowed) return;

    const q = query(collection(db, "users"), orderBy("totalPoints", "desc"), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCreators(data);
    }, (err) => {
      console.error("Leaderboard permission error:", err);
    });
    
    return () => unsubscribe();
  }, [isAllowed]);

  if (!isAllowed) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border text-center">
        <Trophy className="mx-auto text-muted-foreground opacity-20 mb-3" size={32} />
        <p className="text-xs font-bold text-muted-foreground">سجل دخولك لرؤية قائمة المتصدرين</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 border border-border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Trophy className="text-primary" />
          صُنّاع الأسبوع
        </h2>
        <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded">المتصدرون</span>
      </div>

      <div className="space-y-4">
        {creators.map((creator, index) => (
          <Link 
            key={creator.id} 
            href={`/profile/${creator.id}`}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-primary/5 transition-all border border-transparent hover:border-primary/10 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-6 text-center font-bold text-sm text-muted-foreground">
                {getRankIcon(index)}
              </div>
              <Avatar className="w-10 h-10 border-2 border-primary/10 group-hover:scale-105 transition-transform">
                <AvatarImage src={creator.photoURL} alt={creator.displayName} />
                <AvatarFallback>{creator.displayName?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-sm group-hover:text-primary transition-colors">{creator.displayName}</p>
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                   <UserCheck size={10} className="text-green-500" />
                   <span>عضو موثق</span>
                </div>
              </div>
            </div>
            <div className="text-left">
              <span className="font-black text-primary text-sm">{(creator.totalPoints || 0).toFixed(0)}</span>
              <span className="text-[10px] text-muted-foreground mr-1">نقطة</span>
            </div>
          </Link>
        ))}
        {creators.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-4 italic">جاري البحث عن العمالقة...</p>
        )}
      </div>
    </div>
  );
}

const getRankIcon = (index: number) => {
  switch (index) {
    case 0: return <Crown className="text-yellow-400 w-5 h-5" />;
    case 1: return <Medal className="text-gray-300 w-5 h-5" />;
    case 2: return <Medal className="text-amber-600 w-5 h-5" />;
    default: return <Trophy className="text-primary w-4 h-4 opacity-50" />;
  }
};