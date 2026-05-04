'use client';

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, Trash2, ArrowRight, Eye, Flag, Loader2, UserX } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function ContentModerationPage() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData && !userData.isAdmin) return;

    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [userData]);

  const handleDeletePost = async (report: any) => {
    if (!confirm("حذف هذا المنشور نهائياً؟")) return;
    try {
      await deleteDoc(doc(db, "posts", report.postId));
      await deleteDoc(doc(db, "reports", report.id));
      toast({ title: "تم حذف المحتوى المخالف" });
    } catch (e) {}
  };

  const handleDismiss = async (reportId: string) => {
    await deleteDoc(doc(db, "reports", reportId));
    toast({ title: "تم تجاهل البلاغ" });
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 pt-10 pb-24 text-right" dir="rtl">
      <div className="flex items-center gap-4 mb-10">
        <Link href="/admin/launch-dashboard">
          <Button variant="ghost" size="icon" className="rounded-full"><ArrowRight className="rotate-180" /></Button>
        </Link>
        <h1 className="text-3xl font-black flex items-center gap-3">رقابة المحتوى <ShieldAlert className="text-red-500" /></h1>
      </div>

      <div className="space-y-4">
        {reports.map((report) => (
          <Card key={report.id} className="rounded-3xl border-red-500/20 bg-red-500/5">
            <CardContent className="p-6 flex flex-col md:flex-row justify-between gap-6">
               <div className="flex-1">
                  <div className="flex items-center gap-2 text-red-600 mb-2 font-black">
                     <Flag size={16} /> بلاغ: {report.reason}
                  </div>
                  <div className="bg-background/80 p-4 rounded-2xl border border-border">
                     <p className="text-sm italic line-clamp-3">"{report.postText}"</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">المُبلغ: {report.reporterName} | الناشر ID: {report.authorId}</p>
               </div>
               <div className="flex md:flex-col gap-2">
                  <Link href={`/posts/${report.postId}`} target="_blank">
                     <Button variant="outline" className="w-full rounded-xl gap-2 font-bold"><Eye size={16}/> معاينة</Button>
                  </Link>
                  <Button onClick={() => handleDeletePost(report)} className="bg-red-600 hover:bg-red-700 w-full rounded-xl gap-2 font-black"><Trash2 size={16}/> حذف فوراً</Button>
                  <Button onClick={() => handleDismiss(report.id)} variant="ghost" className="w-full rounded-xl text-muted-foreground text-xs">تجاهل</Button>
               </div>
            </CardContent>
          </Card>
        ))}
        {reports.length === 0 && <div className="text-center py-32 text-muted-foreground font-bold">المنصة نظيفة تماماً! لا توجد بلاغات ✨</div>}
      </div>
    </div>
  );
}