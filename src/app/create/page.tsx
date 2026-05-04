"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Send, Loader2, Image as ImageIcon, Video, Link as LinkIcon, Type } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trackPlatformActivity, isRewardPoolOpen } from "@/lib/platform-service";
import { Badge } from "@/components/ui/badge";
import { extractHashtags } from "@/lib/hashtag-service";

const TOPICS_LIST = [
  { id: "tech", name: "التقنية", icon: "💻" },
  { id: "business", name: "ريادة الأعمال", icon: "💼" },
  { id: "design", name: "التصميم", icon: "🎨" },
  { id: "marketing", name: "التسويق", icon: "📈" },
  { id: "health", name: "الصحة", icon: "🏥" },
  { id: "education", name: "التعليم", icon: "📚" },
  { id: "crypto", name: "العملات الرقمية", icon: "₿" },
  { id: "ai", name: "الذكاء الاصطناعي", icon: "🤖" },
];

export default function CreatePostPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [loading, setLoading] = useState(false);

  const isSpecialAccount = !!(userData?.isTestAccount || userData?.isAdmin);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const getCost = () => activeTab === "video" ? 3 : 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim() || !selectedTopic) {
      toast({ variant: "destructive", title: "بيانات ناقصة" });
      return;
    }

    const cost = getCost();
    
    if (!isSpecialAccount && (userData?.totalPoints || 0) < cost) {
      toast({ variant: "destructive", title: "رصيد غير كافي" });
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const data = userSnap.data();

      let lockedDecrease = 0;
      let withdrawableDecrease = 0;

      if (!isSpecialAccount) {
        if ((data?.lockedPoints || 0) >= cost) {
          lockedDecrease = cost;
        } else {
          lockedDecrease = data?.lockedPoints || 0;
          withdrawableDecrease = cost - lockedDecrease;
        }
      }

      const hashtags = extractHashtags(content);

      const postData = {
        title: title || null,
        text: content,
        hashtags,
        authorId: user.uid,
        authorName: userData?.displayName || user.displayName,
        authorPhotoURL: userData?.photoURL || user.photoURL,
        createdAt: serverTimestamp(),
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        totalSecondsSpent: 0,
        engagementScore: 0,
        topicId: selectedTopic,
        topicName: TOPICS_LIST.find(t => t.id === selectedTopic)?.name || "عام",
        contentType: activeTab,
        mediaUrl: (activeTab === 'image' || activeTab === 'video') ? mediaUrl : null,
        externalLink: activeTab === 'link' ? externalLink : null
      };

      await addDoc(collection(db, "posts"), postData);
      
      // التحديثات المالية وإحصائيات المنصة
      try {
        if (!isSpecialAccount) await trackPlatformActivity('post');

        const poolOpen = await isRewardPoolOpen();
        const rewardAmount = poolOpen ? 5 : 0; 

        const updatePayload: any = {
          postsCount: increment(1)
        };

        if (!isSpecialAccount) {
          const withdrawableReward = Math.floor(rewardAmount * 0.51);
          const lockedReward = rewardAmount - withdrawableReward;

          updatePayload.totalPoints = increment(-cost + rewardAmount);
          updatePayload.totalEarned = increment(rewardAmount);
          updatePayload.withdrawablePoints = increment(-withdrawableDecrease + withdrawableReward); 
          updatePayload.lockedPoints = increment(-lockedDecrease + lockedReward);
        } else {
          updatePayload.totalPoints = increment(rewardAmount);
          updatePayload.totalEarned = increment(rewardAmount);
          updatePayload.withdrawablePoints = increment(rewardAmount);
        }

        await updateDoc(userRef, updatePayload);

        if (rewardAmount > 0 && !isSpecialAccount) {
          await trackPlatformActivity('reward', rewardAmount, user.uid, `مكافأة نشر ${activeTab}`);
        }
      } catch (statsError) {
        console.error("Stats update failed, but post was created:", statsError);
      }

      toast({ title: "تم النشر بنجاح! 🚀" });
      router.push("/");
    } catch (error: any) {
      console.error("Publishing error:", error);
      toast({ 
        variant: "destructive", 
        title: "فشل النشر", 
        description: error.message || "حدث خطأ غير متوقع، حاول مرة أخرى." 
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 text-right" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <Link href="/"><Button variant="ghost" size="icon" className="rounded-full"><ArrowRight className="rotate-180" /></Button></Link>
        <h1 className="text-2xl font-black">نشر جديد</h1>
        {isSpecialAccount && <Badge className="bg-primary/20 text-primary">🧪 تجريبي</Badge>}
      </div>

      <Tabs defaultValue="text" onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-card h-16 rounded-2xl p-1 border">
          <TabsTrigger value="text" className="rounded-xl font-bold"><Type size={16} /></TabsTrigger>
          <TabsTrigger value="image" className="rounded-xl font-bold"><ImageIcon size={16} /></TabsTrigger>
          <TabsTrigger value="video" className="rounded-xl font-bold"><Video size={16} /></TabsTrigger>
          <TabsTrigger value="link" className="rounded-xl font-bold"><LinkIcon size={16} /></TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-card border p-6 rounded-3xl shadow-sm">
          <div className="space-y-2">
            <label className="text-xs font-bold mr-2 text-muted-foreground">مجال النقطة</label>
            <Select value={selectedTopic} onValueChange={setSelectedTopic} required>
              <SelectTrigger className="rounded-xl h-12 bg-background"><SelectValue placeholder="اختر المجال..." /></SelectTrigger>
              <SelectContent className="rounded-xl">
                {TOPICS_LIST.map(topic => (
                  <SelectItem key={topic.id} value={topic.id}>{topic.icon} {topic.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold mr-2 text-muted-foreground">عنوان المنشور (اختياري)</label>
            <Input placeholder="عنوان جذاب..." value={title} onChange={(e) => setTitle(e.target.value)} className="h-12 rounded-xl bg-background" />
          </div>

          {(activeTab === 'image' || activeTab === 'video') && (
            <div className="space-y-2">
              <label className="text-xs font-bold mr-2 text-muted-foreground">رابط الميديا</label>
              <Input placeholder="https://..." value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className="h-12 rounded-xl bg-background text-left font-mono" required />
            </div>
          )}

          {activeTab === 'link' && (
            <div className="space-y-2">
              <label className="text-xs font-bold mr-2 text-muted-foreground">الرابط المرجعي</label>
              <Input placeholder="https://..." value={externalLink} onChange={(e) => setExternalLink(e.target.value)} className="h-12 rounded-xl bg-background text-left font-mono" required />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold mr-2 text-muted-foreground">المحتوى</label>
            <Textarea placeholder="ماذا يدور في ذهنك؟ استخدم الهاشتاقات..." value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[140px] rounded-xl bg-background leading-relaxed" required />
          </div>

          <Button type="submit" disabled={loading} className="w-full h-14 rounded-2xl text-lg font-black gap-2 shadow-lg shadow-primary/20">
            {loading ? <Loader2 className="animate-spin" /> : <>نشر - {getCost()} نقاط <Send size={20} /></>}
          </Button>
        </form>
      </Tabs>
    </div>
  );
}