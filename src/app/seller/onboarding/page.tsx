
'use client';

import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowRight, Store, ShieldCheck, Zap, Sparkles, 
  Loader2, Phone, CheckCircle2, Gavel, FileText, AlertTriangle 
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function SellerOnboardingPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [storeName, setStoreName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [agreed, setAgreed] = useState(false);

  const handleActivate = async () => {
    if (!user) return;
    if (!storeName.trim() || !whatsapp.trim() || !agreed) {
      toast({ 
        variant: "destructive", 
        title: "بيانات ناقصة", 
        description: "يرجى ملء كافة البيانات والموافقة على اتفاقية التاجر." 
      });
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        isSeller: true,
        storeName: storeName.trim(),
        storeWhatsapp: whatsapp.trim(),
        sellerAgreementSigned: true,
        sellerAgreementDate: serverTimestamp(),
        sellerActivatedAt: serverTimestamp(),
      });
      
      toast({ 
        title: "تم تفعيل المتجر بنجاح! 🎊", 
        description: "أهلاً بك كتاجر رسمي في NokTek." 
      });
      
      router.push("/seller/dashboard");
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ في التفعيل", description: "حدث خطأ أثناء حفظ بيانات متجرك، حاول مرة أخرى." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-10 pb-24 text-right" dir="rtl">
      <div className="flex items-center gap-4 mb-10">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowRight className="rotate-180" />
          </Button>
        </Link>
        <h1 className="text-2xl font-black">تفعيل وضع التاجر</h1>
      </div>
      
      {step === 1 ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-purple-600/10 border border-purple-500/20 p-8 rounded-3xl text-center space-y-4">
             <Store size={64} className="mx-auto text-purple-500" />
             <h2 className="text-2xl font-black text-purple-600">ابدأ البيع على NokTek</h2>
             <p className="text-muted-foreground text-sm leading-relaxed">
               حول نقاطك وأرباحك إلى منتجات حقيقية، أو ابدأ بعرض خدماتك ومنتجاتك مقابل النقاط الرقمية.
             </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
             <Card className="rounded-3xl border-border bg-card overflow-hidden transition-all hover:border-purple-500/30">
                <CardContent className="p-6 flex items-start gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Zap className="text-primary" />
                   </div>
                   <div>
                      <h3 className="font-bold mb-1">وصول سريع للعملاء</h3>
                      <p className="text-xs text-muted-foreground">منتجاتك ستظهر لآلاف المستخدمين النشطين في المنصة فوراً.</p>
                   </div>
                </CardContent>
             </Card>

             <Card className="rounded-3xl border-border bg-card overflow-hidden transition-all hover:border-green-500/30">
                <CardContent className="p-6 flex items-start gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center shrink-0">
                      <ShieldCheck className="text-green-500" />
                   </div>
                   <div>
                      <h3 className="font-bold mb-1">نظام دفع آمن ومضمون</h3>
                      <p className="text-xs text-muted-foreground">يتم تحصيل النقاط وحجزها آلياً لضمان حقك وحق المشتري.</p>
                   </div>
                </CardContent>
             </Card>
          </div>

          <div className="pt-6">
             <Button 
                onClick={() => setStep(2)}
                className="w-full h-16 rounded-2xl font-black text-xl bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/20 gap-2"
             >
                متابعة الإعداد <Sparkles />
             </Button>
             <p className="text-center text-[10px] text-muted-foreground mt-4">بالمتابعة أنت توافق على شروط التجار ورسوم الخدمة (2.5% لكل عملية بيع).</p>
          </div>
        </div>
      ) : step === 2 ? (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
          <Card className="rounded-3xl border-border bg-card shadow-xl overflow-hidden border-2 border-purple-500/20">
            <CardContent className="p-8 space-y-6">
               <div className="text-center space-y-2">
                  <div className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-purple-500/20">
                    <Store className="text-purple-600" size={40} />
                  </div>
                  <h2 className="text-2xl font-black">إعدادات متجرك</h2>
                  <p className="text-xs text-muted-foreground px-4">أدخل المعلومات الأساسية التي ستظهر للعملاء عند شراء منتجاتك.</p>
               </div>

               <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-bold mr-2 text-purple-600">اسم المتجر / النشاط</label>
                    <Input 
                      placeholder="مثال: متجر السعادة للهدايا" 
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="h-14 rounded-xl border-border bg-muted/20 text-right focus:ring-purple-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold mr-2 flex items-center gap-1 text-green-600">
                      رقم الواتساب للطلبات <Phone size={14} />
                    </label>
                    <Input 
                      placeholder="212600000000" 
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="h-14 rounded-xl border-border bg-muted/20 text-left font-mono focus:ring-green-500"
                      dir="ltr"
                    />
                  </div>
               </div>

               <div className="pt-4 space-y-3">
                  <Button 
                    onClick={() => setStep(3)}
                    disabled={!storeName || !whatsapp}
                    className="w-full h-16 rounded-2xl font-black text-lg bg-purple-600 hover:bg-purple-700 shadow-xl shadow-purple-500/20 gap-2"
                  >
                    التالي: مراجعة الاتفاقية
                    <ArrowRight className="rotate-180" size={20} />
                  </Button>
               </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
           <Card className="rounded-3xl border-primary/20 bg-card shadow-2xl overflow-hidden">
              <div className="bg-primary p-6 text-white flex items-center gap-3">
                 <Gavel size={32} />
                 <div>
                    <h2 className="text-xl font-black">اتفاقية التاجر وضمان المشتري</h2>
                    <p className="text-[10px] opacity-90">يرجى قراءة الشروط التالية بعناية قبل البدء بالبيع</p>
                 </div>
              </div>
              <CardContent className="p-8 space-y-6">
                 <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="flex gap-3">
                       <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-black text-xs">1</div>
                       <p className="text-sm leading-relaxed text-muted-foreground"><span className="font-black text-foreground">الجودة والوصف:</span> أتعهد بأن تكون كافة المنتجات المعروضة مطابقة تماماً للصور والوصف، وبحالة جيدة عند التسليم.</p>
                    </div>
                    <div className="flex gap-3">
                       <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-black text-xs">2</div>
                       <p className="text-sm leading-relaxed text-muted-foreground"><span className="font-black text-foreground">الالتزام بالشحن:</span> ألتزم بشحن المنتج للمشتري خلال مدة أقصاها 48 ساعة من تاريخ الطلب، وتزويد المشتري برقم التتبع إن وجد.</p>
                    </div>
                    <div className="flex gap-3">
                       <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-black text-xs">3</div>
                       <p className="text-sm leading-relaxed text-muted-foreground"><span className="font-black text-foreground">حماية النقاط:</span> أدرك أن النقاط ستبقى محجوزة لدى المنصة ولا يتم تحويلها لمحفظتي إلا بعد تأكيد المشتري للاستلام أو مرور 7 أيام بدون اعتراض.</p>
                    </div>
                    <div className="flex gap-3">
                       <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-black text-xs">4</div>
                       <p className="text-sm leading-relaxed text-muted-foreground"><span className="font-black text-foreground">رسوم المنصة:</span> أوافق على خصم عمولة قدرها <span className="text-primary font-black">2.5%</span> من إجمالي قيمة كل عملية بيع لصالح تشغيل المنصة وتأمين المعاملات.</p>
                    </div>
                    <div className="flex gap-3">
                       <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 text-red-600 font-black text-xs">5</div>
                       <p className="text-sm leading-relaxed text-muted-foreground"><span className="font-black text-red-600">سياسة الاحتيال:</span> أي محاولة لبيع منتجات وهمية أو التواصل خارج المنصة لإتمام البيع ستؤدي لإغلاق المتجر نهائياً وتجميد الرصيد.</p>
                    </div>
                 </div>

                 <div className="bg-muted/30 p-4 rounded-2xl border border-dashed border-border flex items-start gap-3">
                    <Checkbox 
                      id="terms" 
                      checked={agreed} 
                      onCheckedChange={(v) => setAgreed(!!v)}
                      className="mt-1 w-5 h-5 rounded-md border-primary" 
                    />
                    <label htmlFor="terms" className="text-xs font-bold leading-relaxed cursor-pointer select-none">
                       أنا التاجر <span className="text-primary">{userData?.displayName}</span>، أوافق بصفتي صاحب متجر <span className="text-primary">{storeName}</span> على كافة بنود اتفاقية التاجر أعلاه وأتعهد بضمان حقوق المشترين.
                    </label>
                 </div>

                 <div className="pt-2">
                    <Button 
                      onClick={handleActivate}
                      disabled={loading || !agreed}
                      className="w-full h-16 rounded-2xl font-black text-xl bg-green-600 hover:bg-green-700 shadow-xl shadow-green-500/20 gap-2"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : (
                        <>
                          توقيع الاتفاقية وفتح المتجر
                          <CheckCircle2 size={24} />
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setStep(2)}
                      className="w-full mt-2 text-muted-foreground font-bold"
                    >
                      رجوع لتعديل البيانات
                    </Button>
                 </div>
              </CardContent>
           </Card>
        </div>
      )}
    </div>
  );
}

