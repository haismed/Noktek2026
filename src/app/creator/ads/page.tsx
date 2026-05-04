
"use client";

import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, increment, addDoc, serverTimestamp } from "firebase/firestore";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone, Wallet, CheckCircle, XCircle, TrendingUp, ArrowRight, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { extractHashtags } from "@/lib/hashtag-service";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function CreatorAdsDashboard() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [placements, setPlacements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    const q = query(
      collection(db, "adPlacements"),
      where("creatorId", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      setPlacements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, [user, router]);

  const handleApproveAndPublish = async (placement: any) => {
    if (!user || !userData) return;
    
    if (placement.campaignType === "PREMIUM" && placement.requiredHashtag) {
       if (!placement.adContent.toLowerCase().includes(placement.requiredHashtag.toLowerCase())) {
          toast({ variant: "destructive", title: "محتوى مخالف", description: "الإعلان الممول Premium يجب أن يحتوي على الهاشتاق المطلوب." });
          return;
       }
    }

    const hashtags = extractHashtags(placement.adContent);

    setActionLoading(placement.id);
    try {
      const postDoc = await addDoc(collection(db, "posts"), {
        title: `[ممول] ${placement.adTitle}`,
        text: placement.adContent,
        authorId: user.uid,
        authorName: userData.displayName,
        authorPhotoURL: userData.photoURL,
        createdAt: serverTimestamp(),
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        isSponsored: true,
        sponsorId: placement.advertiserId,
        adId: placement.adId,
        campaignType: placement.campaignType || "BASIC",
        requiredHashtag: placement.requiredHashtag || null,
        hashtags: hashtags,
        topicId: "tech",
        topicName: "إعلان",
        mediaUrl: placement.mediaUrl || null,
        mediaType: placement.mediaType || "text",
        externalLink: placement.externalLink || null
      });

      await updateDoc(doc(db, "adPlacements", placement.id), {
        status: "published",
        publishedPostId: postDoc.id
      });

      const creatorAmount = placement.price * 0.9;
      await updateDoc(doc(db, "users", user.uid), {
        totalPoints: increment(creatorAmount),
        adRevenue: increment(creatorAmount),
        totalEarned: increment(creatorAmount),
        withdrawablePoints: increment(creatorAmount * 0.51),
        lockedPoints: increment(creatorAmount * 0.49)
      });

      toast({ title: "تم النشر!", description: `لقد ربحت ${creatorAmount.toFixed(1)} نقطة من هذا الإعلان.` });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ", description: "فشل نشر الإعلان." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (placementId: string) => {
    try {
      await updateDoc(doc(db, "adPlacements", placementId), { status: "rejected" });
      toast({ title: "تم الرفض", description: "تم رفض طلب الإعلان بنجاح." });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>;

  const pending = placements.filter(p => p.status === "pending");
  const published = placements.filter(p => p.status === "published");

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 text-right">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowRight />
          </Button>
        </Link>
        <h1 className="text-2xl font-black">لوحة المبدع</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card className="rounded-3xl border-none bg-primary/10 overflow-hidden">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-primary mb-1">أرباح الإعلانات</p>
            <p className="text-3xl font-black text-primary">{(userData?.adRevenue || 0).toFixed(1)}</p>
            <p className="text-[10px] text-primary/70 mt-1">إجمالي ما ربحته من المعلنين</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-none bg-secondary/10 overflow-hidden">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-secondary mb-1">إعلانات منشورة</p>
            <p className="text-3xl font-black text-secondary">{published.length}</p>
            <p className="text-[10px] text-secondary/70 mt-1">حملات قمت بدعمها</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-card h-14 rounded-2xl p-1 mb-8">
          <TabsTrigger value="pending" className="rounded-xl font-bold relative">
            طلبات جديدة
            {pending.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-[10px] flex items-center justify-center rounded-full font-black animate-pulse">{pending.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="published" className="rounded-xl font-bold">المنشورة</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pending.length === 0 && (
            <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-border">
              <Megaphone className="mx-auto text-muted-foreground opacity-20 mb-3" size={48} />
              <p className="text-muted-foreground font-bold">لا توجد طلبات إعلان حالياً</p>
            </div>
          )}
          {pending.map(p => (
            <Card key={p.id} className="rounded-3xl border-border bg-card overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-lg">{p.adTitle}</h4>
                    {p.campaignType === 'PREMIUM' && <Badge className="bg-yellow-500 text-black text-[8px] font-black h-4 mb-2">PREMIUM: {p.requiredHashtag}</Badge>}
                    <p className="text-xs text-muted-foreground line-clamp-2">{p.adContent}</p>
                  </div>
                  <div className="bg-primary text-white px-3 py-1 rounded-full text-xs font-black">
                    {p.price} نقطة
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-xl font-bold text-destructive" onClick={() => handleReject(p.id)}>
                    <XCircle size={16} className="ml-2" />
                    رفض
                  </Button>
                  <Button className="flex-1 rounded-xl font-black" onClick={() => handleApproveAndPublish(p)} disabled={actionLoading === p.id}>
                    {actionLoading === p.id ? <Loader2 className="animate-spin" /> : (
                      <>
                        <CheckCircle size={16} className="ml-2" />
                        قبول ونشر
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="published" className="space-y-4">
          {published.map(p => (
            <Card key={p.id} className="rounded-3xl border-border bg-card/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="text-green-500" size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm">{p.adTitle}</h5>
                    <p className="text-[10px] text-muted-foreground">تم النشر وحصد الأرباح</p>
                  </div>
                </div>
                <Link href={`/posts/${p.publishedPostId}`}>
                  <Button variant="ghost" size="sm" className="font-bold gap-1 text-primary">
                    عرض المنشور
                    <ArrowRight size={14} className="rotate-180" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
