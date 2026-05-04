
'use client';

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { ArrowRight, LayoutDashboard, Package, ShoppingBag, TrendingUp, Plus, Loader2, Edit3, Trash2, Eye, Sparkles, Store } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AddProductForm from "@/components/AddProductForm";
import { subscribeToMerchantProducts, seedDemoProducts } from "@/lib/seller-service";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useToast } from "@/hooks/use-toast";

export default function SellerDashboardPage() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToMerchantProducts(user.uid, (data) => {
      setProducts(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleSeed = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      await seedDemoProducts(user.uid);
      toast({ title: "تم توليد المنتجات التجريبية بنجاح 🎊" });
    } catch (e) {
      toast({ variant: "destructive", title: "فشل التوليد" });
    } finally {
      setSeeding(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-10 pb-24 text-right" dir="rtl">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowRight className="rotate-180" />
            </Button>
          </Link>
          <h1 className="text-2xl font-black">لوحة تحكم التاجر</h1>
        </div>
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
           <DialogTrigger asChild>
              <Button className="rounded-xl font-bold gap-2 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/20">
                 <Plus size={18} /> منتج جديد
              </Button>
           </DialogTrigger>
           <DialogContent className="p-0 overflow-hidden rounded-3xl border-border bg-card max-w-[95vw] sm:max-w-[500px]">
              <DialogHeader>
                <VisuallyHidden.Root><DialogTitle>إضافة منتج</DialogTitle></VisuallyHidden.Root>
              </DialogHeader>
              <AddProductForm onClose={() => setIsAddModalOpen(false)} />
           </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
         <Card className="rounded-3xl border-none bg-purple-500/10">
            <CardContent className="p-6">
               <p className="text-xs font-bold text-purple-600 mb-1 flex items-center gap-1"><TrendingUp size={12}/> مبيعاتك</p>
               <p className="text-3xl font-black text-purple-600">0.0</p>
               <p className="text-[9px] text-purple-500/70 mt-1">إجمالي النقاط المحصلة</p>
            </CardContent>
         </Card>
         <Card className="rounded-3xl border-none bg-blue-500/10">
            <CardContent className="p-6">
               <p className="text-xs font-bold text-blue-600 mb-1 flex items-center gap-1"><ShoppingBag size={12}/> الطلبات</p>
               <p className="text-3xl font-black text-blue-600">0</p>
               <p className="text-[9px] text-blue-500/70 mt-1">بانتظار المعالجة والشحن</p>
            </CardContent>
         </Card>
      </div>

      <div className="space-y-6">
         <div className="flex items-center justify-between px-1">
            <h3 className="font-black text-lg">منتجاتك ({products.length})</h3>
            <Link href="/marketplace">
              <Button variant="ghost" size="sm" className="text-xs font-bold text-primary gap-1">
                <Store size={14} /> عرض في السوق
              </Button>
            </Link>
         </div>

         {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600" /></div>
         ) : products.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
               {products.map(product => (
                 <Card key={product.id} className="rounded-3xl border-border bg-card overflow-hidden group">
                    <CardContent className="p-4 flex gap-4">
                       <div className="w-24 h-24 rounded-2xl bg-muted overflow-hidden shrink-0 border border-border">
                          <img src={product.imageUrls?.[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="" />
                       </div>
                       <div className="flex-1 flex flex-col justify-between py-1">
                          <div>
                             <h4 className="font-black text-md leading-tight mb-1">{product.title}</h4>
                             <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
                          </div>
                          <div className="flex items-center justify-between">
                             <div className="flex flex-col">
                                <span className="text-sm font-black text-primary">{product.price} <span className="text-[10px]">نقطة</span></span>
                                <span className="text-[9px] font-bold text-muted-foreground">{(product.price * 0.01).toFixed(2)} درهم</span>
                             </div>
                             <div className="flex gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg border border-border hover:bg-muted text-muted-foreground"><Eye size={14} /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg border border-border hover:bg-muted text-muted-foreground"><Edit3 size={14} /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg border border-red-500/20 hover:bg-red-500/10 text-red-500"><Trash2 size={14} /></Button>
                             </div>
                          </div>
                       </div>
                    </CardContent>
                 </Card>
               ))}
            </div>
         ) : (
            <div className="bg-card border border-border p-12 rounded-3xl text-center space-y-6">
               <Package size={64} className="mx-auto text-purple-500 opacity-20" />
               <h2 className="text-xl font-bold">لا توجد منتجات حالياً</h2>
               <p className="text-muted-foreground text-sm">ابدأ بإضافة أول منتج لك أو جرب المنتجات التجريبية لفحص الواجهة.</p>
               <div className="flex flex-col gap-3">
                  <Button onClick={() => setIsAddModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 rounded-xl font-black">إضافة منتج يدوي</Button>
                  <Button onClick={handleSeed} disabled={seeding} variant="outline" className="border-dashed border-purple-400 text-purple-500 rounded-xl font-bold gap-2">
                     {seeding ? <Loader2 className="animate-spin" /> : <><Sparkles size={16}/> توليد 5 منتجات تجريبية</>}
                  </Button>
               </div>
            </div>
         )}
      </div>
    </div>
  );
}
