
'use client';

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Rocket, Zap, TrendingUp, Loader2, Sparkles } from "lucide-react";
import { boostPost } from "@/lib/boost-service";
import { useToast } from "@/hooks/use-toast";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

interface Props {
  post: any;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function BoostModal({ post, userId, isOpen, onClose }: Props) {
  const [budget, setBudget] = useState(100);
  const multiplier = 2; // تثبيت المضاعف على 2x كما طلب المستخدم
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const estimatedReach = Math.floor(budget / (21 * multiplier));

  const handleBoost = async () => {
    setLoading(true);
    try {
      await boostPost(post.id, userId, budget, multiplier);
      toast({ title: "تم تفعيل التعزيز 🚀", description: "سيظهر منشورك الآن لجمهور أكبر بمكافآت مضاعفة." });
      onClose();
    } catch (e: any) {
      toast({ variant: "destructive", title: "فشل التعزيز", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-3xl bg-card border-border max-w-[95vw] sm:max-w-[450px]">
        <DialogHeader>
          <VisuallyHidden.Root><DialogTitle>تعزيز المنشور</DialogTitle></VisuallyHidden.Root>
          <DialogTitle className="text-2xl font-black text-right flex items-center gap-2 justify-end">
             تعزيز المنشور
             <Rocket className="text-yellow-500 animate-pulse" />
          </DialogTitle>
          <DialogDescription className="text-right text-xs leading-relaxed">
            استخدم رصيدك الإعلاني لزيادة ظهور منشورك ومضاعفة مكافآت المتفاعلين (2x) لجذب انتباه أكبر.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-6 text-right" dir="rtl">
           <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <label className="font-bold text-sm">الميزانية: <span className="text-primary">{budget} نقطة</span></label>
                 <Badge variant="secondary">{budget / 100} درهم</Badge>
              </div>
              <Slider 
                value={[budget]} 
                onValueChange={(v) => setBudget(v[0])} 
                min={50} 
                max={5000} 
                step={50} 
                className="py-2"
              />
           </div>

           <div className="space-y-3">
              <label className="font-bold text-sm">مضاعف المكافأة (Reward Boost):</label>
              <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl flex items-center justify-center gap-2">
                 <Zap className="text-primary fill-primary" size={16} />
                 <span className="font-black text-xl text-primary">2x مضاعف النتائج</span>
              </div>
           </div>

           <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                 <TrendingUp size={14} />
                 <span>النتائج المتوقعة:</span>
              </div>
              <p className="text-sm font-medium">الوصول لـ <span className="font-black text-lg">~{estimatedReach}</span> تفاعل كامل وموثق.</p>
              <div className="h-px bg-primary/10" />
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-bold text-muted-foreground">
                 <span className="flex items-center gap-1"><Zap size={10} className="text-yellow-500"/> مشاهدة: {15 * multiplier}</span>
                 <span className="flex items-center gap-1"><Zap size={10} className="text-yellow-500"/> لايك: {1 * multiplier}</span>
                 <span className="flex items-center gap-1"><Zap size={10} className="text-yellow-500"/> تعليق: {2 * multiplier}</span>
                 <span className="flex items-center gap-1"><Zap size={10} className="text-yellow-500"/> مشاركة: {3 * multiplier}</span>
              </div>
           </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleBoost} 
            disabled={loading} 
            className="w-full h-14 rounded-2xl font-black text-lg shadow-lg gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>تأكيد التعزيز الآن <Sparkles size={20}/></>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
