'use client'

import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, increment } from "firebase/firestore";
import { useEffect, useState, use, useRef } from "react";
import PostCard from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Send, MessageCircle, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { initEngagement, getEngagement, rewardEngagement, validateComment, EngagementData } from "@/lib/engagement-service";
import { useToast } from "@/hooks/use-toast";
import { COMMENT_REWARDS } from "@/lib/platform-service";
import { formatTextWithHashtags } from "@/lib/hashtag-service";

interface PostData {
  id: string;
  authorId: string;
  title?: string;
  content?: string;
  createdAt?: any;
  commentCount?: number;
}

export default function PostDetailsPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = use(params);
  const { user, userData } = useAuth();
  const { toast } = useToast();

  const [post, setPost] = useState<PostData | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  const [seconds, setSeconds] = useState(0);
  const [engagement, setEngagement] = useState<EngagementData | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [commentWaitSeconds, setCommentWaitSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const rewardsProcessedRef = useRef<Set<string>>(new Set());

  const isAuthor = user?.uid === post?.authorId;

  useEffect(() => {
    const fetchPost = async () => {
      const docSnap = await getDoc(doc(db, "posts", postId));
      if (docSnap.exists()) {
        const data = { id: docSnap.id,...docSnap.data() } as PostData;
        setPost(data);

        if (user && user.uid!== data.authorId) {
          await initEngagement(postId, user.uid);
          const eng = await getEngagement(postId, user.uid);
          setEngagement(eng);

          if (eng?.tier1_reached) rewardsProcessedRef.current.add('view');
          if (eng?.tier2_reached) rewardsProcessedRef.current.add('tier2');
          if (eng?.tier3_reached) rewardsProcessedRef.current.add('tier3');
          if (eng?.tier4_reached) rewardsProcessedRef.current.add('tier4');
        }
      }
      setLoading(false);
    };

    fetchPost();

    const q = query(
      collection(db, "posts", postId, "comments"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id,...doc.data() })));
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [postId, user]);

  useEffect(() => {
    if (!user || isAuthor) return;
    const unsubEng = onSnapshot(doc(db, "engagements", `${postId}_${user.uid}`), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as EngagementData;
        setEngagement(data);
        if (data.tier1_reached) rewardsProcessedRef.current.add('view');
        if (data.tier2_reached) rewardsProcessedRef.current.add('tier2');
        if (data.tier3_reached) rewardsProcessedRef.current.add('tier3');
        if (data.tier4_reached) rewardsProcessedRef.current.add('tier4');
      }
    });
    return () => unsubEng();
  }, [postId, user, isAuthor]);

  const allRewardsDone = engagement?.tier4_reached && engagement?.likeRewarded && engagement?.commentRewarded && engagement?.shareRewarded;

  useEffect(() => {
    if (!user || loading ||!post ||!isActive || allRewardsDone || isAuthor) return;

    timerRef.current = setInterval(() => {
      setSeconds(prev => {
        const next = prev + 1;

        if (next >= 45 &&!rewardsProcessedRef.current.has('view')) {
          handleWatchReward('view', 15, 45);
        }
        if (next >= 180 &&!rewardsProcessedRef.current.has('tier2')) {
          handleWatchReward('tier2', 10, 135);
        }
        if (next >= 600 &&!rewardsProcessedRef.current.has('tier3')) {
          handleWatchReward('tier3', 10, 420);
        }
        if (next >= 601 &&!rewardsProcessedRef.current.has('tier4')) {
          handleWatchReward('tier4', 15, 1);
        }

        return next;
      });

      if (commentWaitSeconds > 0) setCommentWaitSeconds(p => p - 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user, loading, post, isActive, commentWaitSeconds, allRewardsDone, isAuthor]);

  const handleWatchReward = async (type: string, pts: number, secs: number) => {
    if (!user || isAuthor || rewardsProcessedRef.current.has(type)) return;
    rewardsProcessedRef.current.add(type);

    try {
      const res = await rewardEngagement(user.uid, postId, type, pts, secs);
      if (res.success) {
        toast({ title: `+${res.interactorReward.toFixed(2)} نقطة`, description: `تم الوصول لمستوى مشاهدة جديد.` });
      } else {
        rewardsProcessedRef.current.delete(type);
      }
    } catch (e) {
      rewardsProcessedRef.current.delete(type);
      console.error(e);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() ||!user ||!post) return;

    if (isAuthor) {
      try {
        await addDoc(collection(db, "posts", postId, "comments"), {
          text: newComment,
          authorId: user.uid,
          authorName: userData?.displayName || user.displayName,
          authorPhotoURL: userData?.photoURL || user.photoURL,
          createdAt: serverTimestamp(),
        });
        await updateDoc(doc(db, "posts", postId), { commentCount: increment(1) });
        setNewComment("");
        toast({ title: "تمت إضافة تعليقك" });
      } catch (e) {
        console.error(e);
      }
      return;
    }

    if (!engagement) return;

    const validation = validateComment(newComment, post);
    if (!validation.valid) {
      toast({ variant: "destructive", title: "خطأ في التعليق", description: validation.reason });
      return;
    }

    try {
      await addDoc(collection(db, "posts", postId, "comments"), {
        text: newComment,
        authorId: user.uid,
        authorName: userData?.displayName || user.displayName,
        authorPhotoURL: userData?.photoURL || user.photoURL,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "posts", postId), { commentCount: increment(1) });

      if (!engagement.commentRewarded) {
        const rewardType = validation.type === 'PREMIUM'? 'comment_premium' : 'comment';
        const totalPoints = validation.type === 'PREMIUM'? COMMENT_REWARDS.PREMIUM : COMMENT_REWARDS.BASIC;

        setCommentWaitSeconds(15);
        setTimeout(async () => {
          const res = await rewardEngagement(user.uid, postId, rewardType, totalPoints, 15);
          if (res.success) {
            toast({ title: "تم حصد مكافأة التعليق", description: `كسبت ${res.interactorReward.toFixed(2)} نقطة.` });
          }
        }, 15000);
      }
      setNewComment("");
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-10 text-center flex items-center justify-center min-h-"><Loader2 className="animate-spin text-primary" /></div>;
  if (!post) return <div className="p-10 text-center">المنشور غير موجود</div>;

  let nextGoal = 45;
  if (seconds >= 45) nextGoal = 180;
  if (seconds >= 180) nextGoal = 600;
  const remaining = Math.max(0, nextGoal - seconds);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-32">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full"><ArrowRight /></Button>
          </Link>
          <h1 className="text-xl font-black">تفاصيل النقطة</h1>
        </div>

        {!isAuthor &&!allRewardsDone && (
          <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full animate-in fade-in slide-in-from-top-2">
            <Clock size={14} className="text-primary animate-pulse" />
            <span className="text-xs font-black text-primary">مكافأة بعد: {remaining} ثانية</span>
          </div>
        )}
      </div>

      <PostCard post={post} externalEngData={engagement} />

      <div className="mt-8 space-y-6">
        <h3 className="font-bold flex items-center gap-2"><MessageCircle size={18} className="text-primary" /> النقاش ({comments.length})</h3>
        <form onSubmit={handleSendComment} className="flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={commentWaitSeconds > 0}
            placeholder={commentWaitSeconds > 0? `انتظر ${commentWaitSeconds}ث...` : "أضف تعليقاً مفيداً..."}
            className="flex-1"
          />
          <Button type="submit" disabled={!newComment.trim() || commentWaitSeconds > 0}><Send size={18} /></Button>
        </form>

        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-card p-4 rounded-2xl border-border flex gap-3">
              <Avatar className="w-10 h-10"><AvatarImage src={comment.authorPhotoURL} /><AvatarFallback>{comment.authorName?.[0]}</AvatarFallback></Avatar>
              <div className="flex-1 text-right">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-black">{comment.authorName}</h4>
                  <span className="text-xs text-muted-foreground">{comment.createdAt?.toDate? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true, locale: ar }) : "الآن"}</span>
                </div>
                <div className="text-sm">{formatTextWithHashtags(comment.text)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
