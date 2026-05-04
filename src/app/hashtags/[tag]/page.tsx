"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, limit, onSnapshot } from "firebase/firestore";
import PostCard from "@/components/PostCard";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { ArrowRight, Hash, Users, Loader2, Bell } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";

export default function HashtagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag: rawTag } = use(params);
  const tag = decodeURIComponent(rawTag);
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const normalizedTag = tag.startsWith('#') ? tag.toLowerCase() : `#${tag.toLowerCase()}`;
    
    const q = query(
      collection(db, "posts"),
      where("hashtags", "array-contains", normalizedTag),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPosts(data.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setLoading(false);
    });

    return () => unsub();
  }, [tag]);

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowRight />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black flex items-center gap-1 text-primary">
              <Hash size={24} />
              {tag}
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
              <Users size={12} />
              اكتشف أحدث المنشورات بهذا الوسم
            </p>
          </div>
        </div>
        <Button 
          variant={isFollowing ? "outline" : "default"}
          onClick={toggleFollow}
          className="rounded-xl font-bold gap-2"
        >
          {isFollowing ? "متابع" : "متابعة الهاشتاق"}
          <Bell size={16} className={isFollowing ? "fill-primary text-primary" : ""} />
        </Button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-border">
            <Hash className="mx-auto text-muted-foreground opacity-20 mb-3" size={48} />
            <p className="text-muted-foreground font-bold">لا توجد منشورات بهذا الهاشتاق حالياً</p>
          </div>
        ) : (
          posts.map(post => <PostCard key={post.id} post={post} />)
        )}
      </div>

      <BottomNav />
    </div>
  );
}