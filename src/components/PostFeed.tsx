"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, where, orderBy, limit } from "firebase/firestore";
import PostCard from "./PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { refreshGeneralFeedCache } from "@/lib/feed-service";

export default function PostFeed({ filterByTopics }: { filterByTopics?: string[] }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Optimized Path: General Feed Cache (The "All" or "Default" Feed)
    if (!filterByTopics || filterByTopics.length === 0) {
      setLoading(true);
      
      // Trigger background refresh if needed
      refreshGeneralFeedCache().catch(console.error);

      // Listen to the single shared cache document
      const unsub = onSnapshot(doc(db, "platform", "general_feed_cache"), (docSnap) => {
        if (docSnap.exists()) {
          setPosts(docSnap.data().posts || []);
        }
        setLoading(false);
      }, (err) => {
        console.error("Cache Snapshot error:", err);
        setLoading(false);
      });

      return () => unsub();
    } 

    // 2. Per-Topic Feed (Hotfixed: Removed orderBy to avoid Index Missing error)
    const q = query(
      collection(db, "posts"), 
      where("topicId", "in", filterByTopics),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Manual Sorting to avoid Firebase Index Requirement
      data.sort((a: any, b: any) => (b.engagementScore || 0) - (a.engagementScore || 0));
      
      setPosts(data);
      setLoading(false);
    }, (error) => {
      console.error("Feed snapshot error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filterByTopics]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="pb-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {posts.length === 0 && (
        <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border px-8">
          <p className="text-muted-foreground font-bold">
            لا توجد منشورات حالياً في هذه القائمة..
          </p>
        </div>
      )}
    </div>
  );
}