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
import { useState, useEffect, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import BoostModal from "./BoostModal";
import { formatTextWithHashtags } from "@/lib/hashtag-service";

interface PostCardProps {
  post: any;
  onLikeOverride?: () => void;
  likeDisabled?: boolean;
  externalEngData?: any;
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

  // === نظام المكافآت والقفل التدريجي الجديد ===
  const [viewSeconds, setViewSeconds] = useState(0)
  const [rewardClaimed, setRewardClaimed] = useState(false)
  const [likeUnlocked, setLikeUnlocked] = useState(false)
  const [commentUnlocked, setCommentUnlocked] = useState(false)
  const [shareUnlocked, setShareUnlocked] = useState(false)
  const [likeTimer, setLikeTimer] = useState(0)
  const [commentTimer, setCommentTimer] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout>()
  const rewardIntervalRef = useRef<NodeJS.Timeout>()

  const engData = externalEngData || localEngData;

  useEffect(() => {
    if (user && !externalEngData) {
      getEngagement(post.id, user.uid).then(setLocalEngData);
    }
  }, [user, post.id, externalEngData]);

  // عداد المشاهدة + استدعاء API للمكافأة
  useEffect(() => {
    if (!user || !post?.id) return

    const checkReward = async () => {
      try {
        const res = await fetch('/api/reward', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid, postId: post.id, type: 'view' })
        })
        const data = await res.json()

        if (data.seconds) setViewSeconds(data.seconds)

        if (data.status === 'rewarded' && !rewardClaimed) {
          setRewardClaimed(true)
          setLikeUnlocked(true)
          toast({ title: "مبروك 🎉", description: "ربحت 0.01 نقطة من المشاهدة" })
        }
      } catch (e) {
        console.error(e)
      }
    }

    checkReward()
    intervalRef.current = setInterval(() => {
      setViewSeconds(prev => prev + 1)
    }, 1000)

    rewardIntervalRef.current = setInterval(checkReward, 5000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (rewardIntervalRef.current) clearInterval(rewardIntervalRef.current)
    }
  }, [user, post?.id, rewardClaimed, toast])

  // باقي الفانكشنز حق
  // باقي الفانكشنز حق اللايك والشير
  const handleLike = async () => {
    if (!likeUnlocked) {
      toast({ title: "انتظر", description: "شاهد المنشور أكثر لتفعيل الإعجاب" })
      return
    }
    if (onLikeOverride) return onLikeOverride()

    try {
      await rewardEngagement(post.id, user.uid, 'like')
      const newData = await getEngagement(post.id, user.uid)
      setLocalEngData(newData)
    } catch (e) {
      toast({ title: "خطأ", description: "فشل الإعجاب" })
    }
  }

  const handleComment = () => {
    if (!commentUnlocked) {
      toast({ title: "انتظر", description: "شاهد المنشور أكثر لتفعيل التعليق" })
      return
    }
    router.push(`/post/${post.id}`)
  }

  const handleShare = () => {
    if (!shareUnlocked) {
      toast({ title: "انتظر", description: "شاهد المنشور أكثر لتفعيل المشاركة" })
      return
    }
    setIsShareModalOpen(true)
  }

  const handleFeature = async () => {
    if (!user) return
    setIsFeatureLoading(true)
    try {
      const canFeature = await canUserFeaturePost(user.uid)
      if (!canFeature) {
        const time = await getRemainingTime(user.uid)
        toast({ title: "انتظر", description: `يمكنك التمييز بعد ${time}` })
        return
      }
      await featurePost(post.id, user.uid)
      toast({ title: "تم", description: "تم تمييز المنشور بنجاح" })
    } catch (e) {
      toast({ title: "خطأ", description: "فشل تمييز المنشور" })
    } finally {
      setIsFeatureLoading(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`)
    toast({ title: "تم النسخ", description: "تم نسخ رابط المنشور" })
    setIsShareModalOpen(false)
  }

  return (
    <div className="border rounded-lg p-4 bg-card mb-4">
      <div className="flex items-center gap-3 mb-3">
        <Avatar>
          <AvatarImage src={post.author?.avatar} />
          <AvatarFallback>{post.author?.name?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="font-semibold flex items-center gap-1">
            {post.author?.name}
            {post.author?.verified && <ShieldCheck className="w-4 h-4 text-blue-500" />}
          </div>
          <div className="text-sm text-muted-foreground">
            {post.createdAt?.toDate? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: ar }) : 'الآن'}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCopyLink}>
              <Copy className="w-4 h-4 mr-2" />
              نسخ الرابط
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Flag className="w-4 h-4 mr-2" />
              إبلاغ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {post.featured && (
        <Badge className="mb-2 bg-yellow-500">
          <Star className="w-3 h-3 mr-1" />
          منشور مميز
        </Badge>
      )}

      <div
        className="mb-4 whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: formatTextWithHashtags(post.content) }}
      />

      <div className="flex items-center gap-2 text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          disabled={likeDisabled ||!likeUnlocked}
          className={engData?.liked? "text-red-500" : ""}
        >
          <Heart className={`w-4 h-4 mr-1 ${engData?.liked? "fill-current" : ""}`} />
          {engData?.likes || 0}
        </Button>

        <Button variant="ghost" size="sm" onClick={handleComment} disabled={!commentUnlocked}>
          <MessageCircle className="w-4 h-4 mr-1" />
          {engData?.comments || 0}
        </Button>

        <Button variant="ghost" size="sm" onClick={handleShare} disabled={!shareUnlocked}>
          <Share2 className="w-4 h-4 mr-1" />
          {engData?.shares || 0}
        </Button>

        {userData?.canFeature && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFeature}
            disabled={isFeatureLoading}
          >
            <Zap className="w-4 h-4 mr-1" />
            {isFeatureLoading? <RefreshCw className="w-
  
