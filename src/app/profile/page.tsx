
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowRight, Wallet, Lock, Loader2, History, Settings,
  Camera, Check, CreditCard, Zap, UserPlus, Store, Megaphone, 
  Search, ArrowDownLeft, Sparkles, Rocket, Gift, Copy
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { handleInternalTransfer, handleLockedTransfer } from "@/lib/wallet-service";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import SystemInfoBanner from "@/components/SystemInfoBanner";

export default function ProfilePage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // States for Conversions
  const [convTarget, setConvTarget] = useState<'store' | 'friend' | 'ads' | 'locked_store' | 'locked_boost' | 'locked_ads' | null>(null);
  const [convAmount, setConvAmount] = useState("");
  const [convLoading, setConvLoading] = useState(false);
  
  // Friend Search States
  const [friendSearch, setFriendSearch] = useState("");
  const [foundFriends, setFoundFriends] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);

  // Referral States
  const [referralLink, setReferralLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (userData?.referralCode && typeof window !== 'undefined') {
      setReferralLink(`${window.location.origin}/signup?ref=${userData.referralCode}`);
    }
  }, [userData]);

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "تم نسخ رابط الدعوة" });
    setTimeout(() => setCopied(false), 2000);
  };

  const searchFriend = async () => {
    if (friendSearch.length < 3) return;
    setSearching(true);
    try {
      const q = query(
        collection(db, "users"),
        where("displayName", ">=", friendSearch),
        where("displayName", "<=", friendSearch + "\uf8ff"),
        limit(5)
      );
      const snap = await getDocs(q);
      setFoundFriends(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(f => f.id !== user?.uid));
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const executeTransfer = async () => {
    if (!convTarget || !convAmount) return;
    setConvLoading(true);
    try {
      if (convTarget.startsWith('locked_')) {
        // تحويلات الرصيد المجمد (20% عمولة)
        const lockedTarget = convTarget === 'locked_store' ? 'store' : (convTarget === 'locked_boost' ? 'boost' : 'ads');
        await handleLockedTransfer(user!.uid, Number(convAmount), lockedTarget as any);
        toast({ title: "تم تحويل المجمد بنجاح ✅", description: `تمت العملية بنجاح بعد خصم عمولة 20%.` });
      } else {
        // تحويلات الرصيد السائل (7% عمولة)
        await handleInternalTransfer(
          user!.uid, 
          Number(convAmount), 
          convTarget as any, 
          selectedFriend?.id
        );
        toast({ title: "تم التحويل بنجاح ✅", description: `تمت العملية بنجاح بعد خصم عمولة 7%.` });
      }
      setConvTarget(null);
      setConvAmount("");
      setSelectedFriend(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "فشل التحويل", description: e.message });
    } finally {
      setConvLoading(false);
    }
  };

  if (loading || !user || !userData) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>;
  }

  const remainingLiquidTransfers = 3 - (userData.storeTransferCount || 0);
  const remainingLockedTransfers = 3 - (userData.lockedTransferCount || 0);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-32 text-right" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/"><Button variant="ghost" size="icon" className="rounded-full"><ArrowRight /></Button></Link>
          <h1 className="text-2xl font-black">مركز المال</h1>
        </div>
        <div className="flex gap-2">
           <Link href="/stats"><Button variant="ghost" size="icon" className="rounded-xl border border-border"><History size={20} className="text-muted-foreground" /></Button></Link>
           <Link href="/settings/privacy"><Button variant="ghost" size="icon" className="rounded-xl border border-border"><Settings size={20} className="text-muted-foreground" /></Button></Link>
        </div>
      </div>

      <SystemInfoBanner />

      {/* User Info */}
      <div className="bg-card border border-border rounded-3xl p-6 mb-8 flex items-center gap-4 relative overflow-hidden shadow-sm">
        <div className="relative group shrink-0">
          <Avatar className="w-20 h-20 border-2 border-primary/20 rounded-2xl">
            <AvatarImage src={userData.photoURL} />
            <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
          </Avatar>
          <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white border-2 border-card shadow-lg"><Camera size={12} /></button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
        </div>
        <div className="flex-1 text-right">
           <h2 className="text-lg font-black">{user.displayName}</h2>
           <p className="text-[10px] text-muted-foreground font-mono">@{userData.username || 'user'}</p>
           <div className="mt-2 flex gap-2 justify-end">
              <Badge variant="secondary" className="bg-primary/5 text-primary border-none rounded-lg text-[9px] font-black">{userData.totalPoints?.toFixed(0)} ن إجمالية</Badge>
              <Badge variant="outline" className="border-border rounded-lg text-[9px] font-bold">L: {remainingLiquidTransfers} | M: {remainingLockedTransfers}</Badge>
           </div>
        </div>
      </div>

      {/* Quick Action Buttons Section */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Link href={userData.isCreator ? "/creator/ads" : "/creator/onboarding"} className="block">
          <Card className="rounded-2xl border-border bg-card hover:bg-muted/10 transition-all p-4 text-center group shadow-sm border-2 border-orange-500/10 h-full">
            <Sparkles size={24} className="mx-auto text-orange-500 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-[11px] font-black">المبدع</p>
          </Card>
        </Link>

        <Link href="/advertise" className="block">
          <Card className="rounded-2xl border-border bg-card hover:bg-muted/10 transition-all p-4 text-center group shadow-sm border-2 border-blue-500/10 h-full">
            <Megaphone size={24} className="mx-auto text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-[11px] font-black">المعلن</p>
          </Card>
        </Link>

        <Link href={userData.isSeller ? "/seller/dashboard" : "/seller/onboarding"} className="block">
          <Card className="rounded-2xl border-border bg-card hover:bg-muted/10 transition-all p-4 text-center group shadow-sm border-2 border-purple-500/10 h-full">
            <Store size={24} className="mx-auto text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-[11px] font-black">المتجر</p>
          </Card>
        </Link>
      </div>

      {/* Referral Quick Card (Added in the specific red box location) */}
      <div className="mb-8">
        <Card className="rounded-[2rem] border-none bg-gradient-to-r from-primary/10 via-primary/5 to-purple-600/10 overflow-hidden group shadow-sm border border-primary/5 relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl -mr-12 -mt-12 rounded-full" />
          <CardContent className="p-4 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary group-hover:rotate-12 transition-transform">
                <Gift size={24} />
              </div>
              <div className="text-right">
                <h3 className="text-sm font-black text-primary">شارك واربح +25 نقطة 🎁</h3>
                <p className="text-[10px] text-muted-foreground font-bold leading-tight">ادعُ أصدقاءك وابنِ شبكتك الربحية الدائمة</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                className="rounded-xl h-10 border-primary/20 bg-background/50 hover:bg-primary/10 text-primary font-black text-[10px] gap-2"
                onClick={handleCopy}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                نسخ الرابط
              </Button>
              <Link href="/referrals">
                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl text-primary hover:bg-primary/5">
                   <ArrowRight className="rotate-180" size={18} />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Cards */}
      <div className="space-y-4 mb-8">
        {/* Withdrawable Pool (7% FEE) */}
        <Card className="rounded-3xl border-none bg-green-500/10 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-6 flex-row-reverse">
               <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center text-green-600"><Wallet size={24} /></div>
               <Badge className="bg-green-600 text-white border-none text-[8px] font-black">51% رصيد سائل</Badge>
            </div>
            <p className="text-[11px] font-bold text-green-700 mb-1">الرصيد القابل للسحب</p>
            <p className="text-4xl font-black text-green-600">{(userData.withdrawablePoints || 0).toFixed(1)}</p>
            
            <div className="grid grid-cols-2 gap-2 mt-8">
               <Link href="/wallet/withdraw" className="block w-full">
                  <Button className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 font-bold text-[10px] gap-1">سحب كاش <CreditCard size={12}/></Button>
               </Link>
               <Button onClick={() => setConvTarget('store')} variant="outline" className="h-12 rounded-xl border-green-600/30 text-green-700 bg-white/50 font-bold text-[10px] gap-1">للمتجر <Store size={12}/></Button>
               <Button onClick={() => setConvTarget('friend')} variant="outline" className="h-12 rounded-xl border-green-600/30 text-green-700 bg-white/50 font-bold text-[10px] gap-1">لصديق <UserPlus size={12}/></Button>
               <Button onClick={() => setConvTarget('ads')} variant="outline" className="h-12 rounded-xl border-green-600/30 text-green-700 bg-white/50 font-bold text-[10px] gap-1">للإعلان <Megaphone size={12}/></Button>
            </div>
          </CardContent>
        </Card>

        {/* Locked Pool (20% FEE) */}
        <Card className="rounded-3xl border-none bg-amber-500/10 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-6 flex-row-reverse">
               <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-600"><Lock size={24} /></div>
               <Badge className="bg-amber-600 text-white border-none text-[8px] font-black">49% رصيد مقفل</Badge>
            </div>
            <p className="text-[11px] font-bold text-amber-700 mb-1">الرصيد المجمد</p>
            <p className="text-4xl font-black text-amber-600">{(userData.lockedPoints || 0).toFixed(1)}</p>
            
            <div className="grid grid-cols-3 gap-2 mt-8">
               <Button onClick={() => setConvTarget('locked_store')} variant="outline" className="h-12 rounded-xl border-amber-600/30 text-amber-700 bg-white/50 font-bold text-[10px] gap-1 px-1">للمتجر <Store size={12}/></Button>
               <Button onClick={() => setConvTarget('locked_boost')} variant="outline" className="h-12 rounded-xl border-amber-600/30 text-amber-700 bg-white/50 font-bold text-[10px] gap-1 px-1">للتعزيز <Rocket size={12}/></Button>
               <Button onClick={() => setConvTarget('locked_ads')} variant="outline" className="h-12 rounded-xl border-amber-600/30 text-amber-700 bg-white/50 font-bold text-[10px] gap-1 px-1">للإعلان <Megaphone size={12}/></Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Internal Transfer Dialog */}
      <Dialog open={!!convTarget} onOpenChange={() => { setConvTarget(null); setConvAmount(""); setSelectedFriend(null); }}>
        <DialogContent className="rounded-3xl bg-card border-border max-w-[95vw] sm:max-w-[450px]">
           <DialogHeader>
              <VisuallyHidden.Root><DialogTitle>التحويل الداخلي</DialogTitle></VisuallyHidden.Root>
              <DialogTitle className="text-2xl font-black text-right flex items-center gap-2 justify-end">
                 {convTarget === 'friend' ? 'تحويل لصديق' : convTarget?.includes('ads') ? 'تحويل لرصيد الإعلانات' : convTarget?.includes('boost') ? 'تحويل للتعزيز' : 'تحويل للمتجر'}
                 <ArrowDownLeft className="text-primary" />
              </DialogTitle>
              <DialogDescription className="text-right text-xs leading-relaxed">
                 {convTarget?.startsWith('locked_') ? 'عمولة تحويل الرصيد المجمد هي 20%.' : 'عمولة تحويل الرصيد السائل هي 7%.'}
                 <br />العمليات المتبقية: <span className="font-black text-primary">
                    {convTarget?.startsWith('locked_') ? remainingLockedTransfers : remainingLiquidTransfers} / 3
                 </span>
              </DialogDescription>
           </DialogHeader>

           <div className="space-y-6 py-4 text-right" dir="rtl">
              {convTarget === 'friend' && (
                <div className="space-y-3">
                   <label className="font-bold text-sm">ابحث عن الصديق:</label>
                   <div className="flex gap-2">
                      <Input placeholder="الاسم المستعار..." value={friendSearch} onChange={e => setFriendSearch(e.target.value)} className="h-12 rounded-xl" />
                      <Button onClick={searchFriend} variant="secondary" className="h-12 rounded-xl"><Search size={18}/></Button>
                   </div>
                   {foundFriends.length > 0 && !selectedFriend && (
                     <div className="bg-muted/30 rounded-2xl p-2 space-y-1 border border-border">
                        {foundFriends.map(f => (
                          <button key={f.id} onClick={() => setSelectedFriend(f)} className="w-full flex items-center gap-3 p-3 hover:bg-primary/10 rounded-xl transition-all">
                             <Avatar className="w-8 h-8"><AvatarImage src={f.photoURL}/></Avatar>
                             <span className="font-bold text-sm">{f.displayName}</span>
                          </button>
                        ))}
                     </div>
                   )}
                   {selectedFriend && (
                     <div className="bg-primary/5 p-3 rounded-2xl flex items-center justify-between border border-primary/20">
                        <div className="flex items-center gap-2">
                           <Avatar className="w-8 h-8"><AvatarImage src={selectedFriend.photoURL}/></Avatar>
                           <span className="font-black text-sm">{selectedFriend.displayName}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedFriend(null)} className="text-destructive font-bold">تغيير</Button>
                     </div>
                   )}
                </div>
              )}

              <div className="space-y-3">
                 <label className="font-bold text-sm">المبلغ المراد تحويله:</label>
                 <Input type="number" value={convAmount} onChange={e => setConvAmount(e.target.value)} className="h-16 rounded-2xl text-center text-3xl font-black" placeholder="0.00" />
              </div>

              {Number(convAmount) > 0 && (
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-2 animate-in fade-in">
                   <div className="flex justify-between text-xs font-bold"><span>المبلغ الأصلي:</span><span>{convAmount} ن</span></div>
                   <div className="flex justify-between text-xs font-bold text-destructive">
                      <span>عمولة المنصة ({convTarget?.startsWith('locked_') ? '20%' : '7%'}):</span>
                      <span>-{Math.ceil(Number(convAmount) * (convTarget?.startsWith('locked_') ? 0.2 : 0.07))} ن</span>
                   </div>
                   <div className="h-px bg-border my-1" />
                   <div className="flex justify-between text-lg font-black"><span className="text-primary">الصافي للمستلم:</span><span>{Math.floor(Number(convAmount) * (convTarget?.startsWith('locked_') ? 0.8 : 0.93))} ن</span></div>
                </div>
              )}
           </div>

           <DialogFooter>
              <Button 
                onClick={executeTransfer} 
                disabled={
                  convLoading || !convAmount || Number(convAmount) <= 0 || 
                  (convTarget === 'friend' && !selectedFriend) || 
                  (convTarget?.startsWith('locked_') ? remainingLockedTransfers <= 0 : remainingLiquidTransfers <= 0)
                }
                className="w-full h-14 rounded-2xl font-black text-lg gap-2"
              >
                 {convLoading ? <Loader2 className="animate-spin" /> : <>تأكيد التحويل الآن <Check /></>}
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
