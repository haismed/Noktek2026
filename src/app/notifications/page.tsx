
'use client';

import { useAuth } from "@/context/auth-context";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, limit, onSnapshot, doc, writeBatch, updateDoc, getDocs, deleteDoc } from "firebase/firestore";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Bell, CheckCircle2, Ticket, Heart, MessageCircle, UserPlus, Zap, Loader2, UserCheck, UserX, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { acceptFriendRequest, rejectFriendRequest } from "@/lib/friends";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function NotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      data.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      
      setNotifications(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach(n => batch.update(doc(db, "notifications", n.id), { read: true }));
    await batch.commit();
  };

  const handleAcceptRequest = async (notif: any) => {
    if (!user) return;
    setActionLoading(notif.id);
    try {
      let rId = notif.requestId;
      if (!rId) {
        // البحث عن المعرف في حال لم يكن مخزناً (للتوافق مع التنبيهات القديمة)
        const q = query(
          collection(db, "friendRequests"),
          where("senderId", "==", notif.fromUserId),
          where("receiverId", "==", user.uid),
          where("status", "==", "pending")
        );
        const snap = await getDocs(q);
        if (!snap.empty) rId = snap.docs[0].id;
      }

      if (rId) {
        await acceptFriendRequest(rId, notif.fromUserId);
        await updateDoc(doc(db, "notifications", notif.id), { 
          read: true,
          type: 'friend_accepted_done',
          message: `أصبحتما أصدقاء الآن ✨` 
        });
        toast({ title: "تم قبول الصداقة بنجاح 🤝" });
      } else {
        toast({ variant: "destructive", title: "الطلب غير موجود أو تم التعامل معه مسبقاً" });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ", description: e.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (notif: any) => {
    if (!user) return;
    setActionLoading(notif.id);
    try {
      let rId = notif.requestId;
      if (!rId) {
        const q = query(
          collection(db, "friendRequests"),
          where("senderId", "==", notif.fromUserId),
          where("receiverId", "==", user.uid),
          where("status", "==", "pending")
        );
        const snap = await getDocs(q);
        if (!snap.empty) rId = snap.docs[0].id;
      }

      if (rId) {
        await rejectFriendRequest(rId);
        await deleteDoc(doc(db, "notifications", notif.id));
        toast({ title: "تم رفض طلب الصداقة" });
      } else {
        await deleteDoc(doc(db, "notifications", notif.id));
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "خطأ" });
    } finally {
      setActionLoading(null);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'ticket_win': return <Ticket className="text-yellow-500" />;
      case 'friend_request': return <UserPlus className="text-blue-500" />;
      case 'friend_accepted': return <CheckCircle2 className="text-green-500" />;
      case 'friend_accepted_done': return <UserCheck className="text-green-500" />;
      case 'like': return <Heart className="text-red-500 fill-red-500" />;
      case 'comment': return <MessageCircle className="text-primary" />;
      default: return <Zap className="text-primary" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 text-right" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/"><Button variant="ghost" size="icon" className="rounded-full"><ArrowRight className="rotate-180" /></Button></Link>
          <h1 className="text-2xl font-black flex items-center gap-2">التنبيهات <Bell className="text-primary" /></h1>
        </div>
        <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs font-bold text-muted-foreground hover:text-primary">
          قراءة الكل
        </Button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-20 animate-pulse text-muted-foreground">جاري جلب آخر الأخبار...</div>
        ) : notifications.length > 0 ? (
          notifications.map((n) => (
            <Card key={n.id} className={cn("rounded-2xl border-border transition-all overflow-hidden", !n.read ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-card/50 opacity-80")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                    {n.fromUserPhoto ? (
                      <img src={n.fromUserPhoto} className="w-full h-full object-cover" alt="" />
                    ) : (
                      getIcon(n.type)
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-sm font-black leading-tight">{n.fromUserName || 'تنبيه جديد'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[9px] text-muted-foreground mt-1 font-mono">
                      {n.createdAt?.toDate ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true, locale: ar }) : 'الآن'}
                    </p>
                  </div>
                  {!n.read && <div className="w-2 h-2 bg-primary rounded-full shrink-0" />}
                </div>

                {/* خيارات طلب الصداقة */}
                {n.type === 'friend_request' && (
                  <div className="mt-4 flex flex-wrap gap-2 justify-end border-t border-border/50 pt-3">
                    <Button 
                      size="sm" 
                      onClick={() => handleAcceptRequest(n)}
                      disabled={actionLoading === n.id}
                      className="bg-green-600 hover:bg-green-700 text-white font-black h-9 rounded-xl px-6 gap-2"
                    >
                      {actionLoading === n.id ? <Loader2 className="animate-spin h-4 w-4" /> : <><UserPlus size={16}/> قبول</>}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleRejectRequest(n)}
                      disabled={actionLoading === n.id}
                      className="text-destructive border-destructive/20 h-9 rounded-xl font-bold px-4"
                    >
                      <UserX size={16} className="ml-1" /> رفض
                    </Button>
                    <Link href={`/profile/${n.fromUserId}`}>
                      <Button variant="ghost" size="sm" className="h-9 rounded-xl text-[11px] font-bold gap-1 text-primary">
                        <ExternalLink size={14} /> عرض الحساب
                      </Button>
                    </Link>
                  </div>
                )}
                
                {/* رابط عرض الملف لباقي التنبيهات التي تحتوي على مستخدم */}
                {n.fromUserId && n.type !== 'friend_request' && (
                  <div className="mt-2 flex justify-end">
                     <Link href={`/profile/${n.fromUserId}`}>
                        <span className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer">
                           عرض ملف {n.fromUserName} <ArrowRight size={10} className="rotate-180" />
                        </span>
                     </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-32 opacity-20">
            <Bell size={64} className="mx-auto mb-4" />
            <p className="font-bold">صندوق التنبيهات فارغ..</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
