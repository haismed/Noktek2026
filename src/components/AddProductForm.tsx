
'use client';

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  X, 
  Loader2, 
  Plus, 
  AlertCircle,
  CheckCircle2,
  Ticket,
  ShoppingBag
} from "lucide-react";
import { addProduct } from "@/lib/seller-service";

interface Props {
  onClose: () => void;
}

export default function AddProductForm({ onClose }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [saleType, setSaleType] = useState<'direct' | 'tickets'>('direct');

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title || !description || !price || imageFiles.length === 0) {
      toast({ variant: "destructive", title: "بيانات ناقصة" });
      return;
    }

    setLoading(true);
    try {
      await addProduct(
        {
          title,
          description,
          price: Number(price),
          stock: saleType === 'tickets' ? 120 : Number(stock),
          merchantId: user.uid,
          saleType
        },
        imageFiles,
        videoFile
      );

      toast({ title: "تم إضافة المنتج بنجاح! 🎊" });
      onClose();
    } catch (error) {
      toast({ variant: "destructive", title: "فشل الإضافة" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-card max-h-[90vh] overflow-y-auto" dir="rtl">
      <div className="text-center space-y-1">
         <h2 className="text-xl font-black">إضافة منتج جديد</h2>
         <p className="text-xs text-muted-foreground">اختر نوع البيع واملأ البيانات</p>
      </div>

      <div className="grid grid-cols-2 gap-2 bg-muted/30 p-1 rounded-2xl">
         <button 
           type="button"
           onClick={() => setSaleType('direct')} 
           className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${saleType === 'direct' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'}`}
         >
            <ShoppingBag size={16}/> بيع مباشر
         </button>
         <button 
           type="button"
           onClick={() => setSaleType('tickets')} 
           className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${saleType === 'tickets' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground'}`}
         >
            <Ticket size={16}/> تذاكر السحب
         </button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
           <label className="text-xs font-bold mr-1">اسم المنتج</label>
           <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="اسم المنتج..." className="h-12 rounded-xl" />
        </div>

        <div className="grid grid-cols-2 gap-3">
           <div className="space-y-2">
              <label className="text-xs font-bold mr-1">{saleType === 'tickets' ? 'القيمة الإجمالية' : 'السعر (بالنقاط)'}</label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="2000" className="h-12 rounded-xl font-black text-primary" />
           </div>
           {saleType === 'direct' && (
             <div className="space-y-2">
                <label className="text-xs font-bold mr-1">الكمية</label>
                <Input type="number" value={stock} onChange={e => setStock(e.target.value)} className="h-12 rounded-xl" />
             </div>
           )}
           {saleType === 'tickets' && (
             <div className="space-y-2">
                <label className="text-xs font-bold mr-1">سعر التذكرة</label>
                <div className="h-12 bg-muted/30 flex items-center justify-center rounded-xl font-black text-primary border border-border">
                   {price ? Math.ceil(Number(price) / 100) : 0} ن
                </div>
             </div>
           )}
        </div>

        <div className="space-y-2">
           <label className="text-xs font-bold mr-1">وصف المنتج</label>
           <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="اشرح مميزات المنتج..." className="min-h-[100px] rounded-xl" />
        </div>

        {/* ... (باقي مكون رفع الصور والفيديو كما هو موجود مسبقاً) */}
        <div className="space-y-3">
           <label className="text-xs font-bold mr-1">صور المنتج</label>
           <div className="grid grid-cols-3 gap-2">
              {imagePreviews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted">
                   <img src={src} className="w-full h-full object-cover" alt="" />
                </div>
              ))}
              {imageFiles.length < 5 && (
                <button type="button" onClick={() => imgInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground">
                   <Plus size={20} />
                </button>
              )}
           </div>
           <input type="file" ref={imgInputRef} className="hidden" accept="image/*" multiple onChange={(e) => {
             const files = Array.from(e.target.files || []);
             setImageFiles(prev => [...prev, ...files]);
             setImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
           }} />
        </div>
      </div>

      <Button disabled={loading} className="w-full h-14 rounded-2xl font-black text-lg gap-2 shadow-lg shadow-primary/20 mt-4">
         {loading ? <Loader2 className="animate-spin" /> : <>نشر المنتج الآن <CheckCircle2 size={20}/></>}
      </Button>
    </form>
  );
}
