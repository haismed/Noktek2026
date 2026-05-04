
'use client';

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Heart, Sparkles, Clock, ShieldCheck, 
  ArrowUpRight, Info, AlertCircle, ShoppingBag, 
  Zap, Loader2, Trophy, UserCheck
} from "lucide-react";
import { 
  getUserCompensationProgress, 
  subscribeToCompensationQueue, 
  subscribeToFundBalance,
  buyWithCompensation
} from "@/lib/compensation-service";
import { subscribeToAllProducts } from "@/lib/seller-service";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function CompensationTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [progress, setProgress] = useState<any>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [fundBalance, setFundBalance] = useState(0);
  const [premiumProducts, setPremiumProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    getUserCompensationProgress(user.uid).then(setProgress);
    
    const unsubQueue = subscribeToCompensationQueue(setQueue);
    const unsubFund = subscribeToFundBalance(setFundBalance);
    const unsubProducts = subscribeToAllProducts((data) => {
       setPremiumProducts(data.filter(p => p.isPremium));
    });

    return () => {
      unsubQueue();
      unsubFund();
      unsubProducts();
    };
  }, [user]);

  const handlePurchase = async (productId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      await buyWithCompensation(user.uid, productId);
      toast({ title: "مبروك! تم الشراء بنجاح ✨", description: "تم استخدام رصيد التعويض لتغطية 49% من التكلفة." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "فشل الشراء", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  if (!progress) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* My Status Card */}
      <Card className="rounded-[2rem] border-primary/20 bg-primary/5 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full -mr-16 -mt-16" />
        <CardContent className="p-8 relative z-10">
           <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-right flex-1">
                 <h3 className="text-xl font-black text-primary mb-2 flex items-center gap-2">
                    <Heart className="fill-primary" size={20} />
                    رصيدك المؤهل للتعويض
                 </h3>
                 <p className="text-sm font-bold text-muted-foreground mb-6 leading-relaxed">
                    نحن نحفظ لك حقك! مقابل كل تذكرة لا تفوز، نقوم بتجميع 1% من قيمتها في عداد تعويضك الخاص.
                 </p>
                 <div className="space-y-2">
                    <div className="flex justify-between text-xs font-black uppercase">
                       <span>{progress.losses.toLocaleString()} / 100,000 ن</span>
                       <span className="text-primary">{progress.progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress.progress} className="h-3 shadow-inner" />
                    <p className="text-[10px] text-muted-foreground font-bold mt-2">
                       {progress.isQualified ? "✅ أنت مؤهل الآن! اختر منتجك من الأسفل." : `باقي لك ${100000 - progress.losses} نقطة لدخول قائمة الانتظار.`}
                    </p>
                 </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 text-center min-w-[150px]">
                 <p className="text-[10px] font-bold text-white/70 mb-1">سيولة الصندوق الحالية</p>
                 <p className="text-3xl font-black text-white">{fundBalance.toLocaleString()}</p>
                 <p className="text-[8px] font-black text-primary bg-white/10 py-1 rounded-full mt-2">100% شفافية</p>
              </div>
           </div>
        </CardContent>
      </Card>

      {/* Products Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
           <h3 className="font-black text-lg flex items-center gap-2">
              <Sparkles className="text-yellow-500" />
              المنتجات المميزة (صناعة الحظ)
           </h3>
           <Badge variant="outline" className="text-[9px] font-black border-primary/30">دعم 49% فعال</Badge>
        </div>
        
        {premiumProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {premiumProducts.map(product => (
              <Card key={product.id} className="rounded-3xl border-border bg-card overflow-hidden group">
                 <div className="aspect-video bg-muted relative overflow-hidden">
                    <img src={product.imageUrls?.[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 right-4 text-white">
                       <h4 className="font-black">{product.title}</h4>
                       <p className="text-xs font-bold opacity-80">{product.price.toLocaleString()} نقطة</p>
                    </div>
                 </div>
                 <CardContent className="p-4 flex items-center justify-between">
                    <div className="text-right">
                       <p className="text-[10px] text-muted-foreground font-bold">تدفع أنت (51%):</p>
                       <p className="font-black text-primary">{(product.price * 0.51).toLocaleString()} ن</p>
                    </div>
                    <Button 
                      onClick={() => handlePurchase(product.id)}
                      disabled={!progress.isQualified || loading} 
                      className="rounded-xl font-black gap-2 h-11"
                    >
                       {loading ? <Loader2 className="animate-spin" /> : <>اقتناص الفرصة <ShoppingBag size={16}/></>}
                    </Button>
                 </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-muted/20 rounded-[2.5rem] border-2 border-dashed">
             <ShoppingBag size={48} className="mx-auto opacity-10 mb-4" />
             <p className="text-muted-foreground font-bold">لا توجد منتجات مميزة متاحة للتعويض حالياً.</p>
          </div>
        )}
      </section>

      {/* Queue Section */}
      <section className="space-y-4">
         <h3 className="font-black text-lg flex items-center gap-2">
            <Clock className="text-primary" />
            قائمة انتظار التعويض (FIFO)
         </h3>
         <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 bg-muted/30 border-b border-border grid grid-cols-4 text-[10px] font-black uppercase text-muted-foreground">
               <span>الترتيب</span>
               <span className="col-span-2">المستفيد</span>
               <span className="text-left">تاريخ الأهلية</span>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
               {queue.map((item) => (
                 <div key={item.uid} className={`p-4 border-b border-border/50 grid grid-cols-4 items-center last:border-0 ${item.uid === user?.uid ? 'bg-primary/5' : ''}`}>
                    <span className="font-black text-primary">#{item.rank}</span>
                    <div className="col-span-2 flex items-center gap-2">
                       <Avatar className="h-8 w-8 border border-primary/20"><AvatarFallback>{item.displayName[0]}</AvatarFallback></Avatar>
                       <div>
                          <p className="font-bold text-sm">{item.displayName}</p>
                          {item.uid === user?.uid && <Badge className="text-[8px] h-4 bg-primary text-white">أنت هنا</Badge>}
                       </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono text-left">
                       {item.qualifiedAt ? formatDistanceToNow(item.qualifiedAt.toDate(), { locale: ar }) : 'الآن'}
                    </span>
                 </div>
               ))}
               {queue.length === 0 && (
                 <div className="p-10 text-center text-muted-foreground italic text-xs">الطابور فارغ حالياً..</div>
               )}
            </div>
         </div>
      </section>

      <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl flex items-start gap-4">
         <AlertCircle className="text-amber-600 shrink-0" size={24} />
         <div className="space-y-1">
            <h4 className="font-black text-amber-700 text-sm">كيف يعمل طابور التعويض؟</h4>
            <p className="text-[11px] text-amber-700/80 leading-relaxed font-bold">
               يتم تفعيل التعويض للمستخدمين المؤهلين حسب تاريخ الوصول للعتبة (الأقدم أولاً). بمجرد أن يغطي رصيد الصندوق حصة الـ 49%، يتاح الخيار للمستخدم الأول في القائمة. هذه السياسة تضمن استدامة الصندوق وعدم استنزافه.
            </p>
         </div>
      </div>
    </div>
  );
}
