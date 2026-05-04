
'use client';

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Ticket, Loader2, Sparkles, AlertCircle, Info } from "lucide-react";
import { buyProductTickets, calculateGlobalTicketLimit, calculateUserSpecificLimit } from "@/lib/ticket-service";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

export default function TicketProductCard({ product }: { product: any }) {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);

  const baseLimit = calculateGlobalTicketLimit(product.sequenceNumber || 0);
  const userLimit = calculateUserSpecificLimit(
    product.sequenceNumber || 0, 
    userData?.lastTicketWinSequence || null, 
    baseLimit
  );

  const handleBuy = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "دخول مطلوب", description: "سجل دخولك للمشاركة في السحب." });
      return;
    }

    if (userLimit <= 0) {
      toast({ variant: "destructive", title: "حظر فوز مؤقت", description: "لقد فزت مؤخراً! لا يمكنك المشاركة في هذا السحب حسب القوانين." });
      return;
    }

    setLoading(true);
    try {
      const res = await buyProductTickets(user.uid, product.id, count);
      toast({ title: "تم شراء التذاكر! 🎟️", description: "نتمنى لك حظاً موفقاً في السحب." });
      
      // إشعار رصيد التعويض
      setTimeout(() => {
         toast({ 
           title: "تأمين الحظ مفعل 🛡️", 
           description: `تمت إضافة ${res.newLosses} نقطة لرصيد تعويضك المستقبلي.` 
         });
      }, 1000);

    } catch (e: any) {
      toast({ variant: "destructive", title: "فشل العملية", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const soldPercent = (product.soldTickets / 120) * 100;

  return (
    <Card className="rounded-3xl border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-0">
        <div className="relative aspect-video bg-muted overflow-hidden">
           <img src={product.imageUrls?.[0]} className="w-full h-full object-cover" alt="" />
           <div className="absolute top-3 right-3">
              <Badge className="bg-primary text-white font-black px-3 py-1 rounded-full shadow-lg gap-1 border-none">
                 <Ticket size={12} /> {product.ticketPrice} نقطة / تذكرة
              </Badge>
           </div>
           <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <h3 className="text-white font-black text-lg">{product.title}</h3>
              <p className="text-white/70 text-[10px] font-bold line-clamp-1">{product.description}</p>
           </div>
        </div>

        <div className="p-5 space-y-6">
           <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase">
                 <span className="text-primary">{product.soldTickets} / 120 تذكرة بيعت</span>
                 <span className="text-muted-foreground">{120 - product.soldTickets} متبقي</span>
              </div>
              <Progress value={soldPercent} className="h-2" />
           </div>

           <div className="bg-muted/30 p-3 rounded-2xl border border-border space-y-2">
              <div className="flex justify-between items-center text-[10px]">
                 <span className="font-bold text-muted-foreground flex items-center gap-1"><Info size={12}/> حد الموجة الحالي:</span>
                 <span className="font-black text-primary">{baseLimit} تذاكر</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                 <span className="font-bold text-muted-foreground flex items-center gap-1"><Sparkles size={12}/> مسموح لك شراء:</span>
                 <span className={`font-black ${userLimit === 0 ? 'text-destructive' : 'text-green-500'}`}>{userLimit} تذاكر</span>
              </div>
           </div>

           <div className="flex gap-2">
              <Input 
                type="number" 
                min={1} 
                max={userLimit} 
                value={count} 
                onChange={(e) => setCount(Number(e.target.value))} 
                className="w-20 h-12 rounded-xl text-center font-black border-primary/20"
              />
              <Button 
                onClick={handleBuy} 
                disabled={loading || userLimit === 0 || product.soldTickets >= 120} 
                className="flex-1 h-12 rounded-xl font-black gap-2 shadow-lg shadow-primary/20"
              >
                 {loading ? <Loader2 className="animate-spin" /> : <>دخول السحب <Ticket size={18} /></>}
              </Button>
           </div>

           {userLimit === 0 && (
             <div className="flex items-center gap-2 text-[9px] text-destructive bg-destructive/5 p-2 rounded-lg border border-destructive/10">
                <AlertCircle size={14} />
                <span>أنت في فترة حظر الفوز المؤقت (حماية المجتمع)</span>
             </div>
           )}
        </div>
      </CardContent>
    </Card>
  );
}
