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
import { enUS } from "date-fns/locale";
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

  // === Progressive Reward & Lock System ===
  const [viewSeconds, setViewSeconds] = useState(0);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [likeUnlocked, setLikeUnlocked] = useState(false);
  const [commentUnlocked, setCommentUnlocked] = useState(false);
  const [shareUnlocked, setShareUnlocked] = useState(false);
  const [likeTimer, setLikeTimer] = useState(0);
  const [commentTimer, setCommentTimer] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();
  const rewardIntervalRef = useRef<NodeJS.Timeout>();

  const engData = externalEngData || localEngData;

  useEffect(() => {
    if (user &&!externalEngData) {
      getEngagement(post.id, user.uid).then(setLocalEngData);
    }
  }, [user, post.id, externalEngData]);

  // View counter + API call for reward
  useEffect(() => {
    if (!user ||!post?.id) return;

    const checkReward = async () => {
      try {
        const res = await fetch('/api/reward', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid, postId: post.id, type: 'view' })
        });
        const data = await res.json();

        if (data.seconds) setViewSeconds(data.seconds);

        if (data.status === 'rewarded' &&!rewardClaimed) {
          setRewardClaimed(true);
          setLikeUnlocked(true);
          toast({ title: "Congratulations 🎉", description: "You earned 0.01 points from viewing" });
        }
      } catch (e) {
        console.error(e);
      }
    };

    checkReward();
    intervalRef.current = setInterval(() => {
      setViewSeconds(prev => prev + 1);
    }, 1000);

    rewardIntervalRef.current = setInterval(checkReward, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (rewardIntervalRef.current) clearInterval(rewardIntervalRef.current);
    };
  }, [user, post?.id, rewardClaimed
