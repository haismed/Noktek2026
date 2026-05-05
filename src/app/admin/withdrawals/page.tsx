'use client';

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Landmark, ArrowRight, CheckCircle, XCircle, Clock, Wallet, UserCircle, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils"
export default function AdminWithdrawalsPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (userData && !userData.isAdmin) {
      router.push("/");
      return;
    }

    const q = query(collection(db, "withdrawals"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, [userData, router]);

  const handleAction = async (requestId: string, status: 'approved' | 'rejected', userId: string, amount: number) => {
    if (!confirm("تأكيد هذا الإجراء؟ لا يمكن التراجع.")) return;
    setActionLoading(requestId);
    try {
      await updateDoc(doc(db, "withdrawals", requestId), {
        status,
        processedAt: serverTimestamp()
      });
      
      if (status === 'rejected') {
        // إعادة النقاط للمستخدم في حال الرفض
        await updateDoc(doc(db, "users", userId), {
          withdrawablePoints: increment(amount),
          totalPoints: increment(amount)
        });
      }
      
      toast({ title: status === 'approved' ? "تم تأكيد التحويل" : "تم رفض الطلب وإرجاع النقاط" });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 pt-10 pb-24 text-right" dir="rtl">
      <div className="flex items-center gap-4 mb-10">
        <Link href="/admin/launch-dashboard">
          <Button variant="ghost" size="icon" className="rounded-full"><ArrowRight className="rotate-180" /></Button>
        </Link>
        <h1 className="text-3xl font-black flex items-center gap-3">إدارة طلبات السحب <Landmark className="text-primary" /></h1>
      </div>

      <div className="space-y-6">
        {requests.map((req) => (
          <Card key={req.id} className={cn("rounded-3xl border-border overflow-hidden", req.status === 'pending' ? 'border-primary/20 bg-primary/5' : 'opacity-70')}>
            <CardContent className="p-6">
               <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="space-y-4 flex-1">
                     <div className="flex items-center gap-3">
                        <UserCircle className="text-muted-foreground" size={40} />
                        <div>
                           <p className="font-black text-lg">{req.accountName}</p>
                           <p className="text-xs text-muted-foreground">ID: {req.userId}</p>
                        </div>
                        <Badge variant="outline" className={cn("mr-auto", req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-green-500/10 text-green-600')}>
                           {req.status === 'pending' ? 'بانتظار المراجعة' : 'تمت المعالجة'}
                        </Badge>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4 bg-background/50 p-4 rounded-2xl border border-border">
                        <div>
                           <p className="text-[10px] font-bold text-muted-foreground">المبلغ الصافي</p>
                           <p className="text-xl font-black text-green-600">{req.netMAD} <span className="text-xs">درهم</span></p>
                        </div>
                        <div>
                           <p className="text-[10px] font-bold text-muted-foreground">اسم البنك</p>
                           <p className="text-sm font-black">{req.bankName}</p>
                        </div>
                        <div className="col-span-2">
                           <p className="text-[10px] font-bold text-muted-foreground">رقم الـ RIB</p>
                           <p className="text-sm font-mono tracking-widest bg-white/5 p-2 rounded-lg">{req.rib}</p>
                        </div>
                     </div>
                  </div>

                  {req.status === 'pending' && (
                    <div className="flex md:flex-col gap-2 justify-center">
                       <Button 
                         onClick={() => handleAction(req.id, 'approved', req.userId, req.points)}
                         disabled={actionLoading === req.id}
                         className="bg-green-600 hover:bg-green-700 font-black h-12 px-8 rounded-xl gap-2"
                       >
                          {actionLoading === req.id ? <Loader2 className="animate-spin" /> : <><CheckCircle size={18}/> تأكيد التحويل</>}
                       </Button>
                       <Button 
                         onClick={() => handleAction(req.id, 'rejected', req.userId, req.points)}
                         disabled={actionLoading === req.id}
                         variant="outline" 
                         className="border-red-500/30 text-red-600 hover:bg-red-500/10 font-bold h-12 px-8 rounded-xl"
                       >
                          رفض الطلب
                       </Button>
                    </div>
                  )}
               </div>
            </CardContent>
          </Card>
        ))}
        {requests.length === 0 && <div className="text-center py-32 text-muted-foreground italic">لا توجد طلبات سحب حالية..</div>}
      </div>
    </div>
  );
}
