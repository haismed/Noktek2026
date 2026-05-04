
'use client';

import { useState, useEffect } from "react";
import { subscribeToAllProducts } from "@/lib/seller-service";
import { subscribeToTicketProducts } from "@/lib/ticket-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ShoppingBag, ArrowRight, Loader2, Search, Filter, 
  Tag, Star, ChevronLeft, ShieldCheck, Zap, Ticket, Heart
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import BottomNav from "@/components/BottomNav";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TicketProductCard from "@/components/TicketProductCard";
import CompensationTab from "@/components/CompensationTab";

export default function MarketplacePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [ticketProducts, setTicketProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("direct");

  useEffect(() => {
    const unsubDirect = subscribeToAllProducts((data) => {
      setProducts(data.filter(p => p.saleType !== 'tickets' && !p.isPremium));
      if (activeTab === 'direct') setLoading(false);
    });

    const unsubTickets = subscribeToTicketProducts((data) => {
      setTicketProducts(data);
      if (activeTab === 'tickets') setLoading(false);
    });

    return () => {
      unsubDirect();
      unsubTickets();
    };
  }, [activeTab]);

  const filteredDirect = products.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTickets = ticketProducts.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-32 text-right" dir="rtl">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full"><ArrowRight className="rotate-180" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <ShoppingBag className="text-primary" />
              سوق NokTek
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold">تسوق بذكاء باستخدام نقاط تفاعلك</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1 px-3 py-1 rounded-full">
           <Zap size={10} fill="currentColor" /> 1 ن = 0.01 د.م.
        </Badge>
      </header>

      <div className="relative mb-8">
        <Input 
          placeholder="ابحث في السوق..." 
          className="h-14 pr-12 rounded-2xl bg-card border-border shadow-sm focus:ring-primary"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Search className="absolute right-4 top-4 text-muted-foreground" />
      </div>

      <Tabs defaultValue="direct" onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-card h-14 rounded-2xl p-1 mb-8 border border-border">
          <TabsTrigger value="direct" className="rounded-xl font-bold flex gap-2">
            <ShoppingBag size={16} /> بيع مباشر
          </TabsTrigger>
          <TabsTrigger value="tickets" className="rounded-xl font-bold flex gap-2">
            <Ticket size={16} /> سحب التذاكر
          </TabsTrigger>
          <TabsTrigger value="compensation" className="rounded-xl font-bold flex gap-2">
            <Heart size={16} /> صندوق التعويض
          </TabsTrigger>
        </TabsList>

        <TabsContent value="direct">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={40} /></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredDirect.map((product) => (
                <Card key={product.id} className="rounded-3xl border-border bg-card overflow-hidden group hover:shadow-xl transition-all">
                  <CardContent className="p-0">
                    <div className="aspect-square relative overflow-hidden bg-muted">
                      <img src={product.imageUrls?.[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={product.title} />
                    </div>
                    <div className="p-4 space-y-2">
                      <h3 className="font-black text-sm leading-tight line-clamp-1">{product.title}</h3>
                      <div className="flex flex-col">
                        <span className="text-lg font-black text-primary">{product.price} <span className="text-[10px]">نقطة</span></span>
                        <span className="text-[10px] font-bold text-muted-foreground">≈ {(product.price * 0.01).toFixed(2)} درهم</span>
                      </div>
                      <Button className="w-full h-10 rounded-xl font-bold text-xs">شراء الآن</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tickets">
           <div className="bg-primary/5 p-4 rounded-2xl mb-6 border border-primary/10">
              <p className="text-[10px] font-bold leading-relaxed text-primary">
                💡 نظام التذاكر: تذكرة واحدة = 1% من قيمة المنتج. يتم السحب آلياً عند وصول 120 تذكرة. الحد الأقصى يتغير دورياً لضمان عدالة الفوز للجميع.
              </p>
           </div>
           {loading ? (
             <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={40} /></div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredTickets.map((product) => (
                  <TicketProductCard key={product.id} product={product} />
                ))}
             </div>
           )}
        </TabsContent>

        <TabsContent value="compensation">
           <CompensationTab />
        </TabsContent>
      </Tabs>

      <BottomNav />
    </div>
  );
}
