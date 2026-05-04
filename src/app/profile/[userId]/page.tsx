'use client';

import { useAuth } from "@/context/auth-context";
import { useEffect, useState, use } from "react";
import { getUserProfile } from "@/lib/profile-service";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, ShieldCheck, Lock, Loader2, Sparkles, MessageCircle, Star, Calendar, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import FriendshipButton from "@/components/FriendshipButton";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { useRouter } from "next/navigation";

export default function UserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const fetchProfile = async () => {
    if (!user) return;
    setLoading(true);
    const result = await getUserProfile(userId, user.uid);
    setData(result);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    
    fetchProfile();

    const postsQ = query(
      collection(db, "posts"),
      where("authorId", "==", userId),
      limit(20)
    );

    const unsubPosts = onSnapshot(postsQ, (snap) => {
      let fetchedPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fetchedPosts.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setPosts(fetchedPosts);
      setPostsLoading(false);
    });

    return () => unsubPosts();
  }, [userId, user]);

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>;
  if (!user) return null;
  if (!data) return <div className="min-h-screen flex items-center justify-center font-bold">المستخدم غير موجود</div>;

  const { profile } = data;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-32 text-right">
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
          <ArrowRight />
        </Button>
        <h1 className="text-xl font-black">الملف الشخصي</h1>
        <div className="w-10" />
      </div>

      <div className="bg-card border border-border rounded-3xl p-8 mb-8 flex flex-col items-center text-center shadow-sm relative overflow-hidden">
        {profile.isVerified && (
          <div className="absolute top-4 right-4">
             <Badge className="bg-primary text-white font-black rounded-full gap-1 py-1"><ShieldCheck size={12}/> موثق</Badge>
          </div>
        )}
        
        <div className="relative mb-4">
          <Avatar className="w-28 h-28 border-4 border-primary/20 relative z-10 rounded-full">
            <AvatarImage src={profile.photoURL} />
            <AvatarFallback className="text-2xl font-black">{profile.displayName[0]}</AvatarFallback>
          </Avatar>
        </div>
        
        <h2 className="text-2xl font-black mb-1">{profile.displayName}</h2>
        <p className="text-primary font-mono text-xs mb-3">@{profile.username}</p>
        
        <p className="text-sm text-muted-foreground mb-6 max-w-sm leading-relaxed italic">
          {profile.bio || "لا يوجد وصف حالياً."}
        </p>

        <div className="flex gap-4 mb-8 bg-muted/20 p-4 rounded-2xl w-full justify-around border border-border/50">
           <div className="text-center">
              <p className="font-black text-xl">{profile.stats?.friendsCount || 0}</p>
              <p className="text-[10px] text-muted-foreground font-bold">صديق</p>
           </div>
           <div className="w-px h-8 bg-border" />
           <div className="text-center">
              <p className="font-black text-xl">{profile.stats?.postsCount || posts.length}</p>
              <p className="text-[10px] text-muted-foreground font-bold">منشور</p>
           </div>
        </div>

        <div className="flex gap-3 w-full">
           <div className="flex-1">
              <FriendshipButton 
                targetUserId={userId} 
                currentUserId={user?.uid || ""} 
                initialStatus={profile.friendshipStatus}
                requestedBy={profile.requestedBy}
                requestId={profile.requestId}
                onStatusChange={fetchProfile}
              />
           </div>
           <Link href={`/messages/${userId}`} className="flex-1">
              <Button variant="outline" className="w-full rounded-2xl font-bold gap-2 h-12">
                <MessageCircle size={20} />
                رسالة
              </Button>
           </Link>
        </div>
      </div>

      <div className="space-y-6">
         <h3 className="font-black text-lg flex items-center gap-2">
            <LayoutGrid size={20} className="text-primary" />
            المنشورات ({posts.length})
         </h3>
         
         {postsLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
         ) : posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map(post => <PostCard key={post.id} post={post} />)}
            </div>
         ) : (
            <div className="text-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed border-border p-10">
               <p className="text-muted-foreground text-sm font-bold italic">لا توجد منشورات متاحة حالياً.</p>
            </div>
         )}
      </div>

      <BottomNav />
    </div>
  );
}