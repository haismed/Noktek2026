
'use client';

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, limit } from "firebase/firestore";
import { useAuth } from "@/context/auth-context";
import { Bell } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function NotificationBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // تم تبسيط الاستعلام لتجنب الحاجة لفهرس مركب فوري
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      // تصفية التنبيهات غير المقروءة في طرف العميل
      const unread = snap.docs.filter(d => !d.data().read);
      setUnreadCount(unread.length);
    });

    return () => unsub();
  }, [user]);

  return (
    <Link href="/notifications" className="relative group p-2 rounded-full hover:bg-white/10 transition-colors">
      <Bell size={20} className={cn("text-white transition-transform group-hover:rotate-12", unreadCount > 0 && "fill-yellow-500 text-yellow-500 animate-pulse")} />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[8px] flex items-center justify-center rounded-full font-black border-2 border-background">
          {unreadCount > 9 ? '+9' : unreadCount}
        </span>
      )}
    </Link>
  );
}
