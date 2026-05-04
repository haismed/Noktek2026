
"use client";

import { useState } from "react";
import { auth, db, googleProvider } from "@/lib/firebase";
import { signInWithEmailAndPassword, signInWithPopup, getAdditionalUserInfo } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, LogIn, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getDeviceFingerprint } from "@/lib/fingerprint";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const logoImage = PlaceHolderImages.find(img => img.id === 'noktek-logo')?.imageUrl || "https://picsum.photos/seed/noktek/200/200";

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "تم تسجيل الدخول" });
      router.push("/");
    } catch (error: any) {
      console.error("Login Error:", error.code);
      let message = "تأكد من البريد الإلكتروني وكلمة المرور.";
      if (error.code === 'auth/invalid-credential') {
        message = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
      }
      
      toast({
        variant: "destructive",
        title: "خطأ في تسجيل الدخول",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const additionalInfo = getAdditionalUserInfo(result);
      const isNewUser = additionalInfo?.isNewUser;
      const user = result.user;

      if (isNewUser) {
        const fingerprint = await getDeviceFingerprint();
        const deviceRef = doc(db, "devices", fingerprint);
        const deviceDoc = await getDoc(deviceRef);

        if (deviceDoc.exists()) {
          toast({
            variant: "destructive",
            title: "جهاز مسجل مسبقاً",
            description: "هذا الجهاز مسجل بحساب آخر.",
          });
          setGoogleLoading(false);
          return;
        }

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          displayName: user.displayName || "مستخدم NokTek",
          email: user.email,
          photoURL: user.photoURL || `https://picsum.photos/seed/${user.uid}/200/200`,
          totalPoints: 10,
          withdrawablePoints: 0,
          lockedPoints: 10,
          totalEarned: 10,
          followedTopics: [],
          createdAt: serverTimestamp(),
        });

        await setDoc(deviceRef, {
          uid: user.uid,
          email: user.email,
          createdAt: serverTimestamp()
        });

        toast({ title: "أهلاً بك في NokTek!", description: "تم إنشاء حسابك وحصلت على 10 نقاط ترحيبية." });
      }

      router.push("/");
    } catch (error: any) {
      console.error("Google Auth error:", error);
      toast({
        variant: "destructive",
        title: "خطأ في Google",
        description: "فشل تسجيل الدخول باستخدام جوجل.",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-md bg-card border border-border rounded-[2.5rem] p-10 shadow-2xl text-right overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-secondary" />
        
        <div className="text-center mb-10">
          <div className="w-28 h-28 overflow-hidden rounded-[2rem] bg-white flex items-center justify-center mx-auto mb-6 border border-primary/10 shadow-inner p-3">
            <Image 
                src={logoImage} 
                alt="Logo" 
                width={90} 
                height={90} 
                className="object-contain"
                data-ai-hint="modern tech logo"
            />
          </div>
          <h1 className="text-4xl font-black text-primary mb-2 tracking-tighter">NokTek</h1>
          <p className="text-muted-foreground font-bold">بوابتك لاقتصاد التفاعل الذكي</p>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="font-black mr-1">البريد الإلكتروني</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="pr-10 h-14 rounded-2xl bg-background border-border text-right font-bold"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Mail className="absolute right-3 top-5 text-muted-foreground w-4 h-4" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="font-black mr-1">كلمة المرور</Label>
            <div className="relative">
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="pr-10 h-14 rounded-2xl bg-background border-border text-right font-bold"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock className="absolute right-3 top-5 text-muted-foreground w-4 h-4" />
            </div>
          </div>

          <Button type="submit" disabled={loading || googleLoading} className="w-full bg-primary hover:bg-primary/90 h-16 text-xl font-black rounded-2xl shadow-xl shadow-primary/20">
            {loading ? <Loader2 className="animate-spin" /> : (
              <span className="flex items-center gap-2">
                دخول
                <LogIn size={22} />
              </span>
            )}
          </Button>
        </form>

        <div className="mt-8">
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase font-black">
              <span className="bg-card px-3 text-muted-foreground">أو عبر</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={handleGoogleLogin} 
            disabled={googleLoading || loading}
            className="w-full h-14 border-border hover:bg-muted/20 rounded-2xl font-bold shadow-sm"
          >
            {googleLoading ? <Loader2 className="animate-spin ml-2" /> : <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 ml-2" alt="Google" />}
            المتابعة مع Google
          </Button>
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground font-bold">
          ليس لديك حساب؟{" "}
          <Link href="/signup" className="text-primary font-black hover:underline underline-offset-4">
            أنشئ حساباً جديداً
          </Link>
        </p>
      </div>
    </div>
  );
}
