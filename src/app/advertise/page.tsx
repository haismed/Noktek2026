
"use client";

import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, increment, limit } from "firebase/firestore";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowRight, Megaphone, Users, CheckCircle, Target, Loader2, Gavel, 
  Image as ImageIcon, Video as VideoIcon, Type, Link as LinkIcon, X, Sparkles, 
  Hash, Star, MapPin 
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trackPlatformActivity } from "@/lib/platform-service";
import { extractHashtags, validateHashtagLimit } from "@/lib/hashtag-service";

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

/**
 * دالة لحساب تقييم النجوم (1-5) بناءً على بيانات المؤثر
 */
function calculateInfluencerStars(creator: any) {
  let score = 0;
  
  // 1. بناءً على عدد الأصدقاء (Reach)
  const friends = creator.stats?.friendsCount || 0;
  if (friends > 500) score += 2;
  else if (friends > 100) score += 1;
  else if (friends > 20) score += 0.5;

  // 2. بناءً على النشاط (Post Count)
  const posts = creator.stats?.postsCount || 0;
  if (posts > 50) score += 1;
  else if (posts > 10) score += 0.5;

  // 3. بناءً على اكتمال الملف الجغرافي
  if (creator.country && creator.city) score += 1;

  // 4. بناءً على سعر الإعلان (كلما كان سعره أعلى، غالباً ما يكون تأثيره أكبر)
  if (creator.adPrice > 100) score += 1;

  // حد أدنى 1 وحد أقصى 5
  return Math.max(1, Math.min(5, Math.ceil(score)));
}

export default function AdvertisePage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [topicId, setTopicId] = useState("");
  const [budget, setBudget] = useState("100");
  const [externalLink, setExternalLink] = useState("");
  const [campaignType, setCampaignType] = useState<"BASIC" | "PREMIUM">("BASIC");
  const [requiredHashtag, setRequiredHashtag] = useState("");
  const [mediaType, setMediaType] = useState<"text" | "image" | "video">("text");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 State
  const [creators, setCreators] = useState<any[]>([]);
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [fetchingCreators, setFetchingCreators] = useState(false);

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (mediaType === "image" && file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "حجم الملف كبير", description: "الحد الأقصى للصور هو 5MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => setMediaUrl(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const totalBudget = Number(budget);
  const platformFee = totalBudget * 0.20; 
  const creatorsCut = totalBudget * 0.51; 
  const engagersReserve = totalBudget * 0.29; 

  const handleNextToStep2 = async () => {
    if (!title || !content || !topicId || !budget) {
      toast({ variant: "destructive", title: "بيانات ناقصة", description: "يرجى ملء جميع الحقول الإلزامية." });
      return;
    }
    setStep(2);
    setFetchingCreators(true);
    try {
      const q = query(collection(db, "users"), where("isCreator", "==", true), limit(20));
      const snap = await getDocs(q);
      setCreators(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } finally {
      setFetchingCreators(false);
    }
  };

  const handleLaunchCampaign = async () => {
    if (!user || !userData) return;
    if (userData.totalPoints < totalBudget) {
      toast({ variant: "destructive", title: "رصيد غير كافي", description: `تحتاج لـ ${totalBudget} نقطة.` });
      return;
    }

    setLoading(true);
    try {
      const adDoc = await addDoc(collection(db, "ads"), {
        advertiserId: user.uid, advertiserName: userData.displayName, title, content, topicId, budget: totalBudget, netBudget: creatorsCut, status: "active", mediaType, mediaUrl, externalLink, campaignType, requiredHashtag: requiredHashtag.startsWith('#') ? requiredHashtag : `#${requiredHashtag}`, createdAt: serverTimestamp(), targetCreators: selectedCreators
      });

      for (const cid of selectedCreators) {
        const creator = creators.find(c => c.id === cid);
        await addDoc(collection(db, "adPlacements"), {
          adId: adDoc.id, creatorId: cid, advertiserId: user.uid, price: creator?.adPrice || 0, status: "pending", createdAt: serverTimestamp(), adTitle: title, adContent: content, mediaUrl, mediaType, externalLink, campaignType, requiredHashtag: requiredHashtag.startsWith('#') ? requiredHashtag : `#${requiredHashtag}`
        });
      }

      await updateDoc(doc(db, "users", user.uid), { totalPoints: increment(-totalBudget) });
      await trackPlatformActivity('fee', platformFee + engagersReserve, user.uid, "رسوم خدمة وحوافز تفاعل");

      toast({ title: "تم إطلاق الحملة", description: `تم خصم ${totalBudget} نقطة بنجاح.` });
      router.push("/profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 text-right" dir="rtl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/"><Button variant="ghost" size="icon" className="rounded-full"><ArrowRight className="rotate-180" /></Button></Link>
        <h1 className="text-2xl font-black flex items-center gap-2"><Megaphone className="text-primary" /> إعلان جديد</h1>
      </div>

      <div className="flex justify-between mb-8 px-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-col items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>{s}</div>
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card className="rounded-3xl border-border bg-card overflow-hidden shadow-xl">
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-2 bg-muted/30 p-1 rounded-2xl">
               <button onClick={() => setCampaignType("BASIC")} className={`py-3 rounded-xl font-bold transition-all ${campaignType === 'BASIC' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'}`}>باقة عادية</button>
               <button onClick={() => setCampaignType("PREMIUM")} className={`py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1 ${campaignType === 'PREMIUM' ? 'bg-primary text-white' : 'text-muted-foreground'}`}><Sparkles size={14}/> باقة Premium</button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold mr-2">عنوان الإعلان</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="خصم 50%..." className="h-12 rounded-xl" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold mr-2">محتوى الإعلان</label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="اكتب نص الإعلان..." className="min-h-[120px] rounded-xl" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold mr-2">المجال</label>
                <Select value={topicId} onValueChange={setTopicId}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent className="rounded-xl">{TOPICS_LIST.map(t => <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold mr-2">الميزانية</label>
                <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} className="h-12 rounded-xl font-black" />
              </div>
            </div>
            <Button onClick={handleNextToStep2} className="w-full h-14 rounded-2xl text-lg font-black gap-2">التالي: اختر المبدعين <Users size={20} /></Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
         <div className="space-y-4">
            <div className="mb-6">
              <h3 className="font-black text-xl mb-1">اختر المبدعين لدعمك</h3>
              <p className="text-[10px] text-muted-foreground">يظهر التقييم (1-5 نجوم) بناءً على تفاعل الجمهور والموقع الجغرافي وقوة الحساب.</p>
            </div>
            
            {fetchingCreators ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div> : (
              <div className="space-y-3">
                {creators.map(c => {
                  const stars = calculateInfluencerStars(c);
                  return (
                    <Card key={c.id} className={`rounded-3xl border-2 transition-all cursor-pointer overflow-hidden ${selectedCreators.includes(c.id) ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-card'}`} onClick={() => {
                      setSelectedCreators(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]);
                    }}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <Avatar className="w-14 h-14 border border-border"><AvatarImage src={c.photoURL}/><AvatarFallback>{c.displayName[0]}</AvatarFallback></Avatar>
                           <div>
                              <div className="flex items-center gap-2">
                                <p className="font-black text-md">{c.displayName}</p>
                                <div className="flex">
                                   {[...Array(5)].map((_, i) => (
                                     <Star key={i} size={12} className={i < stars ? "fill-yellow-500 text-yellow-500" : "text-muted"} />
                                   ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                 <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-bold">
                                    <MapPin size={10} className="text-primary" />
                                    {c.privacy?.showLocation ? `${c.city || 'مدينة'}, ${c.country || 'دولة'}` : 'موقع مخفي'}
                                 </span>
                                 <span className="text-[10px] text-primary font-black">{c.adPrice} نقطة</span>
                              </div>
                              <div className="flex gap-1 mt-1">
                                 {c.followedTopics?.slice(0, 2).map((t: string) => (
                                   <span key={t} className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">#{t}</span>
                                 ))}
                              </div>
                           </div>
                        </div>
                        {selectedCreators.includes(c.id) ? <CheckCircle className="text-primary animate-in zoom-in" /> : <div className="w-6 h-6 rounded-full border-2 border-muted" />}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            <Button onClick={() => setStep(3)} disabled={selectedCreators.length === 0} className="w-full h-14 rounded-2xl font-black text-lg mt-6 shadow-lg">التالي: مراجعة الدفع</Button>
         </div>
      )}

      {step === 3 && (
        <Card className="rounded-3xl border-primary bg-primary/5 overflow-hidden shadow-2xl">
          <CardContent className="p-8 text-center space-y-6">
            <h3 className="text-2xl font-black">جاهز للانطلاق؟</h3>
            <div className="bg-card border border-border p-4 rounded-2xl space-y-3">
               <div className="flex justify-between text-sm font-bold"><span className="text-muted-foreground">إجمالي الميزانية:</span><span>{totalBudget} نقطة</span></div>
               <div className="flex justify-between text-sm font-bold text-[#FFD700]"><span>رسوم المنصة (20%):</span><span>-{platformFee.toFixed(0)} نقطة</span></div>
               <div className="h-px bg-border" />
               <div className="flex justify-between text-lg font-black"><span className="text-primary">الصافي للمبدعين (51%):</span><span className="text-green-500">{creatorsCut.toFixed(0)} نقطة</span></div>
            </div>
            <Button onClick={handleLaunchCampaign} disabled={loading} className="w-full h-16 rounded-2xl text-xl font-black gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <>إطلاق الحملة <Megaphone size={24} /></>}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
