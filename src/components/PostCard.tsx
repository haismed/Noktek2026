"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { doc, updateDoc, increment } from "firebase/firestore";

import {
  Heart,
  MessageCircle,
  Share2,
} from "lucide-react";

import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface Post {
  id: string;
  text: string;
  title?: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  createdAt?: any;
  likeCount?: number;
  commentCount?: number;
  mediaUrl?: string;
  contentType?: "image" | "video" | "text";
  isSponsored?: boolean;
  isBoosted?: boolean;
  boostConfig?: {
    rewardMultiplier?: number;
    remainingBudget?: number;
  };
}

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [shareUrl, setShareUrl] = useState("");
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(
        `${window.location.origin}/posts/${post.id}`
      );
    }
  }, [post.id]);

  const multiplier = useMemo(() => {
    if (
      post.isBoosted &&
      post.boostConfig?.remainingBudget &&
      post.boostConfig.remainingBudget > 0
    ) {
      return post.boostConfig.rewardMultiplier || 1;
    }

    return 1;
  }, [post]);

  const handleLike = async (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();

    if (!user) {
      toast({
        title: "دخول مطلوب",
        description: "سجل دخولك أولاً",
      });

      return;
    }

    if (isLiking) return;

    try {
      setIsLiking(true);

      await updateDoc(doc(db, "posts", post.id), {
        likeCount: increment(1),
      });

    } catch (error) {
      console.error(error);

      toast({
        variant: "destructive",
        title: "فشل الإعجاب",
      });

    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();

    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);

      toast({
        title: "تم نسخ الرابط",
      });

    } catch (error) {
      console.error(error);

      toast({
        variant: "destructive",
        title: "فشل النسخ",
      });
    }
  };

  const handleCardClick = () => {
    router.push(`/posts/${post.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-card border rounded-3xl p-5 mb-5 shadow-sm hover:shadow-md transition cursor-pointer"
    >
      <div className="flex items-center justify-between mb-4">

        <Link
          href={`/profile/${post.authorId}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-3"
        >
          <Avatar className="w-11 h-11">
            <AvatarImage src={post.authorPhotoURL} />

            <AvatarFallback>
              {post.authorName?.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div>
            <h3 className="font-bold text-sm">
              {post.authorName}
            </h3>

            <span className="text-xs text-muted-foreground">
              {post.createdAt?.toDate
                ? formatDistanceToNow(
                    post.createdAt.toDate(),
                    {
                      addSuffix: true,
                      locale: ar,
                    }
                  )
                : "الآن"}
            </span>
          </div>
        </Link>
      </div>

      {post.title && (
        <h2 className="text-xl font-black mb-3">
          {post.title}
        </h2>
      )}

      {post.mediaUrl &&
        post.contentType === "image" && (
          <div className="relative w-full h-[300px] mb-4 rounded-2xl overflow-hidden">
            <Image
              src={post.mediaUrl}
              alt="post-image"
              fill
              className="object-cover"
            />
          </div>
        )}

      {post.mediaUrl &&
        post.contentType === "video" && (
          <video
            controls
            className="w-full rounded-2xl mb-4"
          >
            <source src={post.mediaUrl} />
          </video>
        )}

      <p className="text-muted-foreground leading-relaxed mb-5 whitespace-pre-wrap">
        {post.text}
      </p>

      <Progress
        value={multiplier * 10}
        className="mb-5"
      />

      <div className="flex items-center justify-between">

        <button
          onClick={handleLike}
          disabled={isLiking}
          className="flex items-center gap-2"
        >
          <Heart size={20} />

          <span>
            {post.likeCount || 0}
          </span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/posts/${post.id}`);
          }}
          className="flex items-center gap-2"
        >
          <MessageCircle size={20} />

          <span>
            {post.commentCount || 0}
          </span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-2"
        >
          <Share2 size={20} />

          <span>مشاركة</span>
        </button>
      </div>
    </div>
  );
}
