
"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Sparkles, 
  Loader2, 
  Send, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Link2, 
  X,
  Filter
} from "lucide-react";
import { generatePostIdeas } from "@/ai/flows/generate-post-ideas-flow";
import { useToast } from "@/hooks/use-toast";
import { trackPlatformActivity, isRewardPoolOpen } from "@/lib/platform-service";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function NewPostForm({ onClose }: { onClose: () => void }) {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  const isSpecialAccount = userData?.isTestAccount || userData?.isAdmin;

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
  }, [imagePreviews, videoPreview]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (imageFiles.length + files.length > 5) {
      toast({ variant: "destructive", title: "الحد الأقصى 5 صور" });
      return;
    }
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) return;
      setImageFiles(prev => [...prev, file]);
      setImagePreviews(prev => [...prev, URL.createObjectURL(file)]);
    });
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 50 * 1024 * 1024) return;
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user || !selectedTopic) {
      if (!selectedTopic) toast({ variant: "destructive", title: "اختر مجالاً للمنشور" });
      return;
    }

    const cost = 2;

    if (!isSpecialAccount && (userData?.totalPoints || 0) < cost) {
      toast({ variant: "destructive", title: "نقاطك غير كافي" });
      return;
    }

    const hashtags = extractHashtags(text);

    setLoading(true);
    setUploading(true);

    try {
      let mainMediaUrl = null;
      let additionalImageUrls: string[] = [];

      if (videoFile) {
        const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_video`);
        const snapshot = await uploadBytes(storageRef, videoFile);
        mainMediaUrl = await getDownloadURL(snapshot.ref);
      } else if (imageFiles.length > 0) {
        for (let i = 0; i < imageFiles.length; i++) {
          const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_img_${i}`);
          const snapshot = await uploadBytes(storageRef, imageFiles[i]);
          const url = await getDownloadURL(snapshot.ref);
          if (i === 0) mainMediaUrl = url;
          else additionalImageUrls.push(url);
        }
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const dbData = userSnap.data();

      let lockedDecrease = 0;
      let withdrawableDecrease = 0;

      if (!isSpecialAccount) {
        const currentLocked = dbData?.lockedPoints || 0;
        if (currentLocked >= cost) {
          lockedDecrease = cost;
        } else {
          lockedDecrease = currentLocked;
          withdrawableDecrease = cost - lockedDecrease;
        }
      }

      const postPayload = {
        text,
        hashtags,
        authorId: user.uid,
        authorName: userData?.displayName || user.displayName,
        authorPhotoURL: userData?.photoURL || user.photoURL,
        createdAt: serverTimestamp(),
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        contentType: videoFile ? 'video' : imageFiles.length > 0 ? 'image' : 'text',
        mediaUrl: mainMediaUrl,
        additionalImages: additionalImageUrls,
        externalLink: link || null,
        topicId: selectedTopic,
        topicName: TOPICS_LIST.find(t => t.id === selectedTopic)?.name || "عام",
        engagementScore: 0,
        totalSecondsSpent: 0
      };

      await addDoc(collection(db, "posts"), postPayload);

      if (!isSpecialAccount) trackPlatformActivity('post');

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
        trackPlatformActivity('reward', rewardAmount, user.uid, "مكافأة نشر محتوى");
      }

      toast({ title: "رائع!", description: rewardAmount > 0 ? "تم النشر وحصلت على مكافأة!" : "تم النشر بنجاح" });
      onClose();
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "خطأ في النشر" });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleAiAssist = async () => {
    setAiLoading(true);
    try {
      const result = await generatePostIdeas({ postText: text, tone: "funny" });
      if (result.ideas.length > 0) setText(result.ideas[0]);
    } catch (error) {} finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="p-6 bg-card max-h-[90vh] overflow-y-auto" dir="rtl">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-black">نقطة جديدة</h2>
        {isSpecialAccount && <div className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">🧪 وضع الاختبار</div>}
      </div>
      <p className="text-xs text-muted-foreground mb-6">شارك شيئاً مبهراً (يكلف 2، يمنح 5)</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-muted-foreground flex items-center gap-1">
            <Filter size={12} className="text-primary" />
            مجال المنشور (ليصل للمهتمين)
          </label>
          <Select value={selectedTopic} onValueChange={setSelectedTopic} required>
            <SelectTrigger className="h-12 rounded-xl bg-background border-border">
              <SelectValue placeholder="اختر المجال..." />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {userData?.followedTopics?.length > 0 && (
                <>
                  <p className="text-[9px] font-bold text-muted-foreground p-2 pb-1">تخصصاتك</p>
                  {TOPICS_LIST.filter(t => userData.followedTopics.includes(t.id)).map(topic => (
                    <SelectItem key={topic.id} value={topic.id}>{topic.icon} {topic.name}</SelectItem>
                  ))}
                  <div className="h-px bg-border my-1" />
                  <p className="text-[9px] font-bold text-muted-foreground p-2 pb-1">باقي المجالات</p>
                  {TOPICS_LIST.filter(t => !userData.followedTopics.includes(t.id)).map(topic => (
                    <SelectItem key={topic.id} value={topic.id}>{topic.icon} {topic.name}</SelectItem>
                  ))}
                </>
              )}
              {(!userData?.followedTopics || userData.followedTopics.length === 0) && TOPICS_LIST.map(topic => (
                <SelectItem key={topic.id} value={topic.id}>{topic.icon} {topic.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Textarea
          placeholder="ماذا يدور في ذهنك؟ استخدم الهاشتاقات لزيادة الانتشار..."
          className="min-h-[140px] bg-background border-border rounded-2xl text-right"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={uploading}
        />
        
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" onClick={() => imageInputRef.current?.click()} className="rounded-xl"><ImageIcon size={18} /></Button>
          <Button type="button" variant="outline" size="icon" onClick={() => videoInputRef.current?.click()} className="rounded-xl"><VideoIcon size={18} /></Button>
          <Button type="button" variant="outline" size="icon" onClick={() => setShowLinkInput(!showLinkInput)} className="rounded-xl"><Link2 size={18} /></Button>
          <div className="flex-1" />
          <button type="button" onClick={handleAiAssist} disabled={aiLoading} className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold">
            {aiLoading ? <Loader2 className="animate-spin w-3" /> : <Sparkles size={12} />} ذكاء اصطناعي
          </button>
        </div>

        <input type="file" ref={imageInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
        <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={handleVideoUpload} />

        {showLinkInput && <Input placeholder="رابط خارجي..." value={link} onChange={(e) => setLink(e.target.value)} className="rounded-xl text-left font-mono" />}

        {(imagePreviews.length > 0 || videoPreview) && (
          <div className="grid grid-cols-3 gap-2">
            {imagePreviews.map((img, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                <img src={img} className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 left-1 bg-black/50 p-1 rounded-full"><X size={10} className="text-white"/></button>
              </div>
            ))}
          </div>
        )}

        <Button type="submit" disabled={loading || !text.trim() || !selectedTopic} className="w-full h-14 rounded-2xl text-lg font-bold gap-2 shadow-lg shadow-primary/20">
          {loading ? <Loader2 className="animate-spin" /> : <><Send size={18} /> نشر الآن</>}
        </Button>
      </form>
    </div>
  );
}
