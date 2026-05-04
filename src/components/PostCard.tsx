"use client";

import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { 
  Heart, MessageCircle, Share2, MoreHorizontal, Flag, 
  ShieldCheck, Lock, PlayCircle, Star, Sparkles, Zap, 
  CheckCircle2, Copy, Send, Rocket, RefreshCw, Facebook, Twitter
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { rewardEngagement, getEngagement, recordShareClick } from "@/lib/engagement-service";
import { canUserFeaturePost, getRemainingTime, featurePost } from "@/lib/featured-service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import BoostModal from "./BoostModal";
import { formatTextWithHashtags } from "@/lib/hashtag-service";

interface PostCardProps {
  post: any;
  onLikeOverride?: () => void;
  likeDisabled?: boolean;
  externalEngData?: any; // تم إضافة هذا الحقل لاستقبال البيانات من الصفحة الأب
}

export default function PostCard({ post, onLikeOverride, likeDisabled, externalEngData }: PostCardProps) {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isFeatureLoading, setIsFeatureLoading] = useState(false);
  const [localEngData, setLocalEngData] = useState<any>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isBoostOpen, setIsBoostOpen] = useState(false);
  const [isReposting, setIsReposting] = useState(false);

  // استخدام البيانات الخارجية إن وجدت، وإلا استخدام الحالة المحلية
  const engData = externalEngData || localEngData;

  useEffect(() => {
    if (user && !externalEngData) {
      getEngagement(post.id, user.uid).then(setLocalEngData);
    }
  }, [user, post.id, externalEngData]);

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/posts/${post.id}?ref=${user?.uid || 'anon'}` : '';
  const shareText = `شاهد هذا المحتوى المثير على NokTek: ${post.title || post.text.substring(0, 50)}...`;

  const handleLike = async () => {
    if (onLikeOverride) {
      onLikeOverride();
      return;
    }
    if (!user) {
      toast({ title: "دخول مطلوب", description: "سجل دخولك للتفاعل." });
      return;
    }
    try {
      updateDoc(doc(db, "posts", post.id), { likeCount: increment(1) });
    } catch (e) {}
  };

  const handleReport = async () => {
    if (!user) return;
    try {
      await addDoc(collection(db, "reports"), {
        postId: post.id,
        postText: post.text,
        authorId: post.authorId,
        reporterId: user.uid,
        reporterName: userData?.displayName,
        reason: "محتوى غير لائق",
        createdAt: serverTimestamp()
      });
      toast({ title: "شكراً لتعاونك", description: "تم إرسال البلاغ للمراجعة وسيتخذ المسؤول الإجراء اللازم." });
    } catch (e) {}
  };

  const handleShareClick = async () => {
    if (!user) { toast({ title: "دخول مطلوب" }); return; }
    
    if (post.isSponsored && (!engData || !engData.tier1_reached)) {
      toast({ variant: "destructive", title: "مشاهدة مطلوبة", description: "شاهد 45 ثانية أولاً لفتح ميزة المشاركة." });
      return;
    }

    setIsShareModalOpen(true);
    await recordShareClick(post.id, user.uid);
  };

  const handleRepost = async () => {
    if (!user || !userData) return;
    if (isReposting) return;

    setIsReposting(true);
    setIsShareModalOpen(false);

    try {
      await addDoc(collection(db, "posts"), {
        text: post.text,
        authorId: user.uid,
        authorName: userData.displayName,
        authorPhotoURL: userData.photoURL,
        createdAt: serverTimestamp(),
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        isReshare: true,
        originalPostId: post.id,
        originalAuthorName: post.authorName,
        topicId: post.topicId,
        topicName: post.topicName,
        mediaUrl: post.mediaUrl || null,
        contentType: post.contentType || 'text',
        engagementScore: 0,
        totalSecondsSpent: 0
      });

      if (engData?.shareRewarded) {
        toast({ title: "تمت إعادة النشر", description: "لقد حصلت على مكافأة المشاركة مسبقاً لهذا المنشور." });
      } else {
        processShareReward("Repost");
      }
    } catch (e) {
      toast({ variant: "destructive", title: "فشل إعادة النشر" });
    } finally {
      setIsReposting(false);
    }
  };

  const handleExternalShare = (platform: string, url: string) => {
    window.open(url, '_blank');
    setIsShareModalOpen(false);
    if (!engData?.shareRewarded) {
      processShareReward(platform);
    } else {
      toast({ title: "تمت المشاركة", description: "لقد حصلت على مكافأة المشاركة مسبقاً." });
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "تم نسخ الرابط" });
      setIsShareModalOpen(false);
      if (!engData?.shareRewarded) {
        processShareReward("Link Copy");
      }
    } catch (err) {
      toast({ variant: "destructive", title: "فشل نسخ الرابط" });
    }
  };

  const processShareReward = (platform: string) => {
    toast({ title: "جاري التحقق", description: `شكراً للمشاركة عبر ${platform}. انتظر 15 ثانية للمكافأة...` });
    setTimeout(async () => {
      const res = await rewardEngagement(user!.uid, post.id, 'share', 3, 15);
      if (res.success) {
        toast({ title: "🎉 كسبت مكافأة المشاركة!", description: "تمت إضافة النقاط بنجاح." });
        if (!externalEngData) getEngagement(post.id, user!.uid).then(setLocalEngData);
        updateDoc(doc(db, "posts", post.id), { shareCount: increment(1) });
      }
    }, 15000);
  };

  const handleFeature = async () => {
    if (!user || !userData) return;
    if (!canUserFeaturePost(userData.lastFeaturedPostAt)) {
      toast({ variant: "destructive", title: "مهمة صعبة!", description: getRemainingTime(userData.lastFeaturedPostAt) });
      return;
    }
    setIsFeatureLoading(true);
    try {
      await featurePost(post.id, user.uid);
      toast({ title: "تم التميز!" });
    } finally { setIsFeatureLoading(false); }
  };

  const multiplier = (post.isBoosted && post.boostConfig?.remainingBudget > 0) ? (post.boostConfig.rewardMultiplier || 1) : 1;

  const earnedPoints = (engData?.tier1_reached ? 15 : 0) * multiplier + 
                       (engData?.tier2_reached ? 10 : 0) * multiplier + 
                       (engData?.tier3_reached ? 10 : 0) * multiplier + 
                       (engData?.tier4_reached ? 15 : 0) * multiplier +
                       (engData?.likeRewarded ? 1 : 0) * multiplier + 
                       (engData?.commentRewarded ? (engData.commentType === 'PREMIUM' ? 4 : 2) : 0) * multiplier + 
                       (engData?.shareRewarded ? 3 : 0) * multiplier;

  const maxPoints = (post.isSponsored ? (post.campaignType === 'PREMIUM' ? 73 : 71) : 21) * multiplier;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('button')) return;
    router.push(`/posts/${post.id}`);
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`bg-card border rounded-3xl p-5 mb-5 shadow-sm hover:shadow-md transition-all text-right relative overflow-hidden cursor-pointer group ${post.isFeatured ? 'border-yellow-500/50 ring-2 ring-yellow-500/10' : 'border-border'} ${post.isSponsored ? 'border-primary/30 ring-1 ring-primary/10' : ''} ${post.isBoosted ? 'border-orange-500/40' : ''}`}
    >
      {post.isFeatured && (
        <div className="absolute top-0 left-0 bg-yellow-500 text-black px-3 py-1 rounded-br-2xl flex items-center gap-1 text-[10px] font-black z-10">
          < Star size={12} fill="currentColor" /> منشور مميز
        </div>
      )}

      {post.isBoosted && (
        <div className="absolute top-0 right-0 bg-orange-500 text-white px-3 py-1 rounded-bl-2xl flex items-center gap-1 text-[10px] font-black z-10">
          <Rocket size={12} fill="currentColor" /> {post.boostConfig?.rewardMultiplier}x معزز
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4 flex-row-reverse">
        <Link href={`/profile/${post.authorId}`} className="flex items-center gap-3 flex-row-reverse hover:opacity-80 transition-opacity">
          <Avatar className="w-11 h-11 border-2 border-primary/10">
            <AvatarImage src={post.authorPhotoURL} />
            <AvatarFallback>{post.authorName?.[0]}</AvatarFallback>
          </Avatar>
          <div className="text-right">
            <div className="flex items-center gap-1 flex-row-reverse">
               <h3 className="font-bold text-sm">{post.authorName}</h3>
               {post.isSponsored && <Badge variant="outline" className="text-[8px] h-4 bg-primary/10 text-primary gap-1 font-black">مبدع موثق <ShieldCheck size={8} /></Badge>}
               {post.isReshare && <Badge className="text-[8px] h-4 bg-secondary/10 text-secondary gap-1 font-black">معاد نشره <RefreshCw size={8} /></Badge>}
            </div>
            <div className="flex items-center gap-2 flex-row-reverse">
              <span className="text-[10px] text-muted-foreground font-medium">{post.createdAt?.toDate ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: ar }) : "الآن"}</span>
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 rounded-full font-bold">{post.topicName || "عام"}</Badge>
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
           {user?.uid === post.authorId && !post.isBoosted && !post.isReshare && (
             <button onClick={(e) => { e.stopPropagation(); setIsBoostOpen(true); }} className="flex items-center gap-1 text-orange-500 font-black h-8 text-[10px] px-2 rounded-xl hover:bg-orange-50 transition-colors">
               <Rocket size={12} /> تعزيز
             </button>
           )}
           <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full h-8 w-8"><MoreHorizontal size={18} /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              {user && <DropdownMenuItem onClick={handleFeature} className="font-bold gap-2 text-yellow-500"><Sparkles size={14} /> تميز هذا المنشور</DropdownMenuItem>}
              <DropdownMenuItem onClick={handleReport} className="text-destructive font-bold gap-2"><Flag size={14} /> إبلاغ عن محتوى</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className={`mb-4 p-3 rounded-2xl border transition-all ${post.isBoosted ? 'bg-orange-500/5 border-orange-500/20' : 'bg-primary/5 border-primary/10'}`}>
         <div className={`flex justify-between items-center text-[10px] font-black mb-2 ${post.isBoosted ? 'text-orange-600' : 'text-primary'}`}>
            <span>مكافأتك: {earnedPoints.toFixed(1)}/{maxPoints.toFixed(1)} نقطة</span>
            <div className="flex gap-2">
               <span className={engData?.tier1_reached ? 'text-green-500' : 'text-muted-foreground'}>{engData?.tier1_reached ? '✅' : '⭕'} مشاهدة</span>
               <span className={engData?.shareRewarded ? 'text-green-500' : 'text-muted-foreground'}>{engData?.shareRewarded ? '✅' : '⭕'} مشاركة</span>
            </div>
         </div>
         <Progress value={(earnedPoints / maxPoints) * 100} className={`h-1 ${post.isBoosted ? '[&>div]:bg-orange-500' : ''}`} />
      </div>

      <div className="block">
        {post.title && (
          <h2 className="text-xl font-black mb-2 group-hover:text-primary transition-colors">{post.title}</h2>
        )}
        
        {post.mediaUrl && (
          <div className="rounded-2xl overflow-hidden mb-4 border border-border relative">
            {post.contentType === 'video' ? (
              <div className="relative">
                <video src={post.mediaUrl} className="w-full h-auto max-h-[400px] object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <PlayCircle className="text-white w-16 h-16 opacity-80" />
                </div>
              </div>
            ) : (
              <img src={post.mediaUrl} className="w-full h-auto object-cover max-h-[400px]" alt="" />
            )}
          </div>
        )}

        <div className="text-md mb-6 leading-relaxed whitespace-pre-wrap font-medium dir-rtl text-muted-foreground line-clamp-3">
          {formatTextWithHashtags(post.text)}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4 flex-row-reverse">
        <div className="flex items-center gap-2 flex-row-reverse">
          <button onClick={(e) => { e.stopPropagation(); handleLike(); }} disabled={likeDisabled} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors flex-row-reverse ${likeDisabled ? 'opacity-50 cursor-not-allowed bg-muted/50' : 'text-muted-foreground hover:bg-red-500/10 hover:text-red-500'}`}>
            {likeDisabled ? <Lock size={16} /> : <Heart size={20} className={post.likeCount > 0 ? "fill-red-500 text-red-500" : ""} />}
            <span className="text-sm font-bold">{post.likeCount || 0}</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); router.push(`/posts/${post.id}`); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors flex-row-reverse">
            <MessageCircle size={20} /> <span className="text-sm font-bold">{post.commentCount || 0}</span>
          </button>
        </div>
        <button onClick={(e) => { e.stopPropagation(); handleShareClick(); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors flex-row-reverse ${engData?.shareRewarded ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:bg-secondary/10 hover:text-secondary'}`}>
          {engData?.shareRewarded ? <CheckCircle2 size={20} /> : <Share2 size={20} />}
          <span className="text-xs font-bold">{engData?.shareRewarded ? 'تمت المشاركة' : 'مشاركة'}</span>
        </button>
      </div>

      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="rounded-[2.5rem] bg-card border-border max-w-[95vw] sm:max-w-[450px] p-8">
          <DialogHeader>
            <VisuallyHidden.Root><DialogTitle>مشاركة واكسب نقاط</DialogTitle></VisuallyHidden.Root>
            <h3 className="text-2xl font-black text-right mb-2">شارك واكسب +{3*multiplier} نقاط 🔄</h3>
            <p className="text-xs text-muted-foreground text-right leading-relaxed mb-4">
              المكافأة تُحتسب مرة واحدة لكل منشور. يُشترط البقاء 15 ثانية بعد الضغط لضمان جودة المشاركة.
            </p>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-4 py-4" dir="rtl">
            <Button onClick={handleRepost} disabled={isReposting} className="h-16 rounded-2xl bg-primary hover:bg-primary/90 font-black text-white text-lg gap-3 shadow-xl shadow-primary/20">
               {isReposting ? <Zap className="animate-spin" size={24} /> : <RefreshCw size={24} />}
               إعادة نشر في صفحتي (Repost)
            </Button>
            
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => handleExternalShare("WhatsApp", `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`)} className="h-14 rounded-2xl bg-[#25D366] hover:bg-[#25D366]/90 font-black text-white gap-2">
                <Send className="rotate-[-45deg]" size={18} /> واتساب
              </Button>
              <Button onClick={() => handleExternalShare("Facebook", `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`)} className="h-14 rounded-2xl bg-[#1877F2] hover:bg-[#1877F2]/90 font-black text-white gap-2">
                <Facebook size={18} /> فيسبوك
              </Button>
            </div>

            <Button onClick={() => handleExternalShare("X", `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`)} variant="outline" className="h-14 rounded-2xl border-border bg-black text-white hover:bg-black/90 font-black gap-2">
               <Twitter size={18} /> شارك عبر X (تويتر)
            </Button>

            <Button onClick={handleCopyLink} variant="secondary" className="h-14 rounded-2xl gap-2 font-black border-border shadow-sm">
              <Copy size={18} /> نسخ رابط المنشور
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BoostModal 
        post={post} 
        userId={user?.uid || ""} 
        isOpen={isBoostOpen} 
        onClose={() => setIsBoostOpen(false)} 
      />
    </div>
  );
}