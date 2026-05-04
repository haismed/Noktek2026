
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, orderBy, onSnapshot } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, Sparkles, Hash, Users, ArrowRight, 
  TrendingUp, Loader2, UserPlus, ShieldCheck 
} from "lucide-react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import FriendshipButton from "@/components/FriendshipButton";

export default function ExplorePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [trendingTags, setTrendingTags] = useState<string[]>(["NokTek", "اقتصاد_التفاعل", "ربح", "تقنية", "ضحك"]);
  const [suggestedCreators, setSuggestCreators] = useState<any[]>([]);
  const [loadingCreators, setLoadingCreators] = useState(true);

  useEffect(() => {
    // جلب مبدعين مقترحين
    const q = query(
      collection(db, "users"),
      where("isCreator", "==", true),
      limit(5)
    );
    const unsub = onSnapshot(q, (snap) => {
      setSuggestCreators(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.id !== user?.uid));
      setLoadingCreators(false);
    });
    return () => unsub();
  }, [user]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const q = query(
        collection(db, "users"),
        where("displayName", ">=", searchQuery),
        where("displayName", "<=", searchQuery + "\uf8ff"),
        limit(10)
      );
      const snap = await getDocs(q);
      const results = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.id !== user?.uid);
      setSearchResults(results);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ في البحث" });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-32 text-right" dir="rtl">
      <header className="mb-8">
        <h1 className="text-2xl font-black flex items-center gap-2 mb-2">
          <Sparkles className="text-primary" />
          استكشف NokTek
        </h1>
        <p className="text-xs text-muted-foreground font-bold">اكتشف أفضل المبدعين والمواضيع الرائجة</p>
      </header>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative mb-8 group">
        <Input 
          placeholder="ابحث عن أصدقاء أو مبدعين..." 
          className="h-14 pr-12 rounded-2xl bg-card border-border shadow-sm focus:ring-primary text-right"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Search className="absolute right-4 top-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Button 
          type="submit" 
          disabled={isSearching}
          className="absolute left-2 top-2 h-10 px-6 rounded-xl font-bold"
        >
          {isSearching ? <Loader2 className="animate-spin w-4 h-4" /> : "بحث"}
        </Button>
      </form>

      {/* Search Results */}
      {searchQuery && searchResults.length > 0 && (
        <section className="mb-10 animate-in fade-in slide-in-from-top-2">
          <h3 className="font-black text-sm text-primary mb-4 flex items-center gap-2">
            <Users size={16} /> نتائج البحث ({searchResults.length})
          </h3>
          <div className="space-y-3">
            {searchResults.map((result) => (
              <Card key={result.id} className="rounded-2xl border-border bg-card/50 overflow-hidden">
                <CardContent className="p-4 flex items-center justify-between">
                  <Link href={`/profile/${result.id}`} className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 border border-primary/10">
                      <AvatarImage src={result.photoURL} />
                      <AvatarFallback>{result.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="text-right">
                      <h4 className="font-bold text-sm flex items-center gap-1">
                        {result.displayName}
                        {result.isVerified && <ShieldCheck size={12} className="text-primary" />}
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-mono">@{result.username || 'user'}</p>
                    </div>
                  </Link>
                  <Button variant="outline" size="sm" className="rounded-xl font-bold text-xs" asChild>
                    <Link href={`/profile/${result.id}`}>عرض الملف</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {searchQuery && searchResults.length === 0 && !isSearching && (
        <div className="text-center py-10 bg-muted/20 rounded-3xl border-2 border-dashed mb-8">
           <p className="text-muted-foreground font-bold">لم نجد مستخدمين بهذا الاسم..</p>
        </div>
      )}

      {/* Trending Hashtags */}
      <section className="mb-10">
        <h3 className="font-black text-sm mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-orange-500" /> مواضيع رائجة الآن
        </h3>
        <div className="flex flex-wrap gap-2">
          {trendingTags.map((tag) => (
            <Link key={tag} href={`/hashtags/%23${tag}`}>
              <Badge variant="secondary" className="px-4 py-2 rounded-xl text-sm font-bold border border-border hover:bg-primary/10 hover:text-primary transition-all cursor-pointer">
                <Hash size={14} className="ml-1 opacity-50" />
                {tag}
              </Badge>
            </Link>
          ))}
        </div>
      </section>

      {/* Recommended Creators */}
      <section>
        <div className="flex items-center justify-between mb-4">
           <h3 className="font-black text-sm flex items-center gap-2">
            <Sparkles size={16} className="text-yellow-500" /> مبدعون قد تود متابعتهم
          </h3>
          <Link href="/leaders" className="text-[10px] font-bold text-primary hover:underline">عرض الكل</Link>
        </div>
        
        <div className="space-y-4">
          {loadingCreators ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
          ) : suggestedCreators.length > 0 ? (
            suggestedCreators.map((creator) => (
              <Card key={creator.id} className="rounded-3xl border-border bg-card overflow-hidden group hover:shadow-md transition-all">
                <CardContent className="p-5 flex items-center justify-between">
                  <Link href={`/profile/${creator.id}`} className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="w-14 h-14 border-2 border-primary/20 group-hover:border-primary/50 transition-colors">
                        <AvatarImage src={creator.photoURL} />
                        <AvatarFallback>{creator.displayName?.[0]}</AvatarFallback>
                      </Avatar>
                      {creator.isVerified && <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-0.5 border-2 border-card"><ShieldCheck size={10} /></div>}
                    </div>
                    <div className="text-right">
                      <h4 className="font-black text-md">{creator.displayName}</h4>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 max-w-[150px]">{creator.bio || "مبدع في NokTek"}</p>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-full">{creator.stats?.friendsCount || 0} صديق</span>
                         <span className="text-[9px] font-black text-green-600 bg-green-500/5 px-2 py-0.5 rounded-full">{creator.totalPoints?.toFixed(0) || 0} ن</span>
                      </div>
                    </div>
                  </Link>
                  <Button size="sm" className="rounded-xl font-black gap-1" asChild>
                    <Link href={`/profile/${creator.id}`}>
                      متابعة <ArrowRight size={14} className="rotate-180" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-center py-10 text-muted-foreground text-xs font-bold">لا توجد اقتراحات حالياً..</p>
          )}
        </div>
      </section>

      <BottomNav />
    </div>
  );
}
