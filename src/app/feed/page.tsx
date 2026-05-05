
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  Timestamp,
  doc,
  getDoc,
  updateDoc,
  increment
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import PostCard from "@/components/PostCard";
import NewPostForm from "@/components/NewPostForm";
import BottomNav from "@/components/BottomNav";
import { 
  Zap, 
  Sparkles, 
  TrendingUp, 
  LayoutGrid, 
  Clock, 
  Wallet, 
  Lock, 
  Plus, 
  Filter,
  Loader2,
  AlertCircle,
  Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Leaderboard from "@/components/Leaderboard";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function FeedPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("for-you");
  const [isQuickPostOpen, setIsQuickPostOpen] = useState(false);

  const logoImage = PlaceHolderImages.find(img => img.id === 'noktek-logo')?.imageUrl || "https://picsum.photos/seed/noktek-brand-identity-final/400/400";

  // حماية الصفحة
  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  // جلب المنشورات بناءً على التبويب
  useEffect(() => {
    if (!user || authLoading) return;

    let q;
    const postsRef = collection(db, "posts");

    if (activeTab === "for-you" && userData?.followedTopics?.length > 0) {
      q = query(
        postsRef,
        where("topicId", "in", userData.followedTopics),
        limit(40)
      );
    } else if (activeTab === "trending") {
      q = query(
        postsRef,
        where("isFeatured", "==", true),
        limit(20)
      );
    } else {
      q = query(postsRef, orderBy("createdAt", "desc"), limit(40));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // ترتيب يدوي في حال استخدام 'in' لتجنب مشاكل الـ Index في الـ Beta
      if (activeTab === "for-you" || activeTab === "trending") {
  data = data.sort((a: any, b: any) => {
    const timeA = a.createdAt?.toMillis?.() || 0;
    const timeB = b.createdAt?.toMillis?.() || 0;
    return timeB - timeA;
  });
}

setPosts(data);
setLoading(false);
      
  
    }, (error) => {
      console.error("Feed error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, activeTab, userData?.followedTopics]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary w-12 h-12" />
      </div>
    );
  }

  const secondsUsed = userData?.dailyEngagement?.secondsUsed || 0;
  const timePercentage = (secondsUsed / 28800) * 100;
  const earningsToday = userData?.dailyEngagement?.pointsEarnedToday || 0;

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6 pb-32">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar الأيمن - معلومات المستخدم السريعة */}
        <aside className="hidden lg:block lg:col-span-3 space-y-6 sticky top-24 h-fit">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
            
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 overflow-hidden rounded-2xl border border-primary/20 bg-white flex items-center justify-center p-1 shadow-lg">
                  <Image 
                    src={logoImage} 
                    alt="Logo" 
                    width={56} 
                    height={56} 
                    className="object-contain"
                    data-ai-hint="tech logo"
                  />
                </div>
                <div>
                  <h3 className="font-black text-lg">أهلاً، {userData?.displayName?.split(' ')[0]}</h3>
                  <p className="text-[10px] text-muted-foreground">اقتصاد الانتباه مفعل</p>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                    <Wallet size={12} className="text-green-500" /> قابل للسحب
                  </span>
                  <span className="font-black text-green-500">{(userData?.withdrawablePoints || 0).toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                    <Lock size={12} className="text-amber-500" /> المحجوز
                  </span>
                  <span className="font-black text-amber-500">{(userData?.lockedPoints || 0).toFixed(1)}</span>
                </div>
                <div className="h-px bg-border w-full" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-black">الإجمالي</span>
                  <span className="text-xl font-black text-primary">{(userData?.totalPoints || 0).toFixed(0)}</span>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <div className="flex justify-between text-[10px] font-black">
                  <span className="text-muted-foreground">نشاط اليوم</span>
                  <span className="text-primary">{earningsToday.toFixed(1)} د.م.</span>
                </div>
                <Progress value={timePercentage} className="h-2" />
                <p className="text-[9px] text-center text-muted-foreground font-bold">
                   استهلكت {(secondsUsed / 3600).toFixed(1)} / 8 ساعات
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
             <h4 className="font-black text-sm mb-4 flex items-center gap-2">
                <Filter size={16} className="text-primary" />
                تخصصاتك المختارة
             </h4>
             <div className="flex flex-wrap gap-2">
                {userData?.followedTopics?.map((t: string) => (
                  <Badge key={t} variant="secondary" className="rounded-xl px-3 py-1 font-bold">
                    {t === 'tech' ? '💻 تقنية' : t === 'ai' ? '🤖 ذكاء' : t}
                  </Badge>
                ))}
             </div>
             <Link href="/topics">
                <Button variant="ghost" className="w-full mt-4 text-xs font-bold text-primary hover:bg-primary/5">
                  تعديل المجالات
                </Button>
             </Link>
          </div>
        </aside>

        {/* المركز - التغذية الرئيسية */}
        <main className="lg:col-span-6 space-y-6">
          {/* صندوق النشر السريع */}
          <div className="bg-card border border-border rounded-3xl p-4 shadow-sm flex items-center gap-4">
             <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/20">
                <img src={userData?.photoURL} alt="" className="w-full h-full object-cover" />
             </div>
             <button 
                onClick={() => router.push('/create')}
                className="flex-1 text-right px-6 py-3 bg-muted/30 hover:bg-muted/50 transition-colors rounded-2xl text-muted-foreground text-sm font-bold"
             >
                شارك "نقطة" جديدة واربح مكافآت..
             </button>
             <Button 
                onClick={() => router.push('/create')}
                size="icon" 
                className="rounded-2xl h-12 w-12 shadow-lg shadow-primary/20"
             >
                <Plus size={24} />
             </Button>
          </div>

          <Tabs defaultValue="for-you" onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-card h-14 rounded-2xl p-1 border border-border shadow-sm">
              <TabsTrigger value="for-you" className="rounded-xl font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                <Sparkles size={16} />
                المخصص
              </TabsTrigger>
              <TabsTrigger value="trending" className="rounded-xl font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                <TrendingUp size={16} />
                الرائج
              </TabsTrigger>
              <TabsTrigger value="all" className="rounded-xl font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                <LayoutGrid size={16} />
                الكل
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              {loading ? (
                <div className="space-y-6">
                   {[1,2,3].map(i => (
                     <div key={i} className="h-64 bg-card border border-border rounded-3xl animate-pulse" />
                   ))}
                </div>
              ) : (
                <div className="space-y-6 pb-20">
                  {posts.map(post => (
                    <PostCard key={post.id} post={post} />
                  ))}
                  {posts.length === 0 && (
                    <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border px-8">
                      <AlertCircle className="mx-auto text-muted-foreground opacity-20 mb-4" size={48} />
                      <p className="text-muted-foreground font-bold">
                        {activeTab === "for-you" 
                          ? "لا توجد منشورات في مجالاتك حالياً. جرب تبويب 'الكل'." 
                          : "لا توجد منشورات متوفرة."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Tabs>
        </main>

        {/* Sidebar الأيسر - المتصدرين واختصارات */}
        <aside className="hidden lg:block lg:col-span-3 space-y-6 sticky top-24 h-fit">
          <Leaderboard />
          
          <div className="bg-gradient-to-br from-secondary to-primary p-6 rounded-3xl text-white shadow-xl relative overflow-hidden group">
             <div className="relative z-10">
                <h4 className="font-black text-lg mb-2 flex items-center gap-2">
                   <Trophy size={20} />
                   نادي المبدعين
                </h4>
                <p className="text-[10px] opacity-90 leading-relaxed mb-4">
                   هل لديك أكثر من 20 صديق؟ فعل وضع المبدع الآن وابدأ بجني الأرباح من المعلنين.
                </p>
                <Link href="/creator/setup">
                   <Button className="w-full bg-white text-primary hover:bg-white/90 font-black rounded-xl h-10">
                      انضم الآن
                   </Button>
                </Link>
             </div>
             <Sparkles className="absolute -bottom-4 -right-4 w-24 h-24 opacity-20 rotate-12 group-hover:scale-125 transition-transform" />
          </div>

          <div className="flex flex-wrap gap-4 justify-center text-[10px] text-muted-foreground font-bold">
             <Link href="/terms" className="hover:text-primary">الشروط</Link>
             <span>•</span>
             <Link href="/advertise" className="hover:text-primary">أعلن معنا</Link>
             <span>•</span>
             <Link href="/stats" className="hover:text-primary">الإحصائيات</Link>
             <span>•</span>
             <p>© 2026 NokTek</p>
          </div>
        </aside>

      </div>

      <BottomNav />
    </div>
  );
}
