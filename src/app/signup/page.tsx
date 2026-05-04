
"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getDeviceFingerprint } from "@/lib/fingerprint";
import { generateReferralCode, getUserByReferralCode, processReferralReward } from "@/lib/referral-service";
import { isRewardPoolOpen, trackPlatformActivity } from "@/lib/platform-service";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function SignupPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const logoImage = PlaceHolderImages.find(img => img.id === 'noktek-logo')?.imageUrl || "https://picsum.photos/seed/noktek/200/200";

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fingerprint = await getDeviceFingerprint();
      const deviceRef = doc(db, "devices", fingerprint);
      const deviceDoc = await getDoc(deviceRef);
      
      if (deviceDoc.exists()) {
        toast({ variant: "destructive", title: "جهاز مسجل مسبقاً", description: "نأسف، لا يمكن إنشاء أكثر من حساب من نفس الجهاز." });
        setLoading(false);
        return;
      }

      let inviter = null;
      if (referralCode.trim()) {
        inviter = await getUserByReferralCode(referralCode.trim());
        if (!inviter) {
          toast({ variant: "destructive", title: "كود غير صالح" });
          setLoading(false);
          return;
        }
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await updateProfile(user, { displayName });

      const poolOpen = await isRewardPoolOpen();
      const initialPoints = poolOpen ? 10 : 0;
      
      const withdrawablePart = Math.floor(initialPoints * 0.51);
      const lockedPart = initialPoints - withdrawablePart;

      const userData = {
        uid: user.uid,
        displayName: displayName,
        email: email,
        photoURL: `https://picsum.photos/seed/${user.uid}/200/200`,
        totalPoints: initialPoints,
        withdrawablePoints: withdrawablePart,
        lockedPoints: lockedPart,
        totalEarned: initialPoints,
        referralCode: generateReferralCode(displayName),
        referredBy: inviter?.id || null,
        followedTopics: [],
        trustScore: 100,
        deviceId: fingerprint,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "users", user.uid), userData);
      await setDoc(deviceRef, { uid: user.uid, email: user.email, createdAt: serverTimestamp() });

      if (initialPoints > 0) await trackPlatformActivity('reward', initialPoints, user.uid);
      await trackPlatformActivity('user');

      if (inviter) await processReferralReward(inviter.id, user.uid, inviter.displayName, displayName);

      toast({ title: "تم إنشاء الحساب بنجاح 🎊", description: "أهلاً بك في مجتمع NokTek." });
      router.push("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: "فشل التسجيل", description: "يرجى المحاولة مرة أخرى ببريد إلكتروني صالح." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md bg-card border border-border rounded-[2.5rem] p-10 shadow-2xl text-right relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-secondary to-primary" />
        
        <div className="text-center mb-10">
          <div className="w-24 h-24 overflow-hidden rounded-[1.5rem] bg-white flex items-center justify-center mx-auto mb-6 border border-primary/10 shadow-inner p-2.5">
             <Image 
                src={logoImage} 
                alt="Logo" 
                width={80} 
                height={80} 
                className="object-contain"
                data-ai-hint="modern tech logo"
             />
          </div>
          <h1 className="text-3xl font-black text-primary mb-2 tracking-tighter">انضم لـ NokTek</h1>
          <p className="text-muted-foreground font-bold">ابدأ بجمع النقاط فوراً</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <div className="space-y-2">
            <Label className="font-black mr-1">الاسم المستعار</Label>
            <Input placeholder="مثال: ضاحك الليل" className="text-right h-12 rounded-xl font-bold" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label className="font-black mr-1">البريد الإلكتروني</Label>
            <Input type="email" placeholder="name@example.com" className="text-right h-12 rounded-xl font-bold" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label className="font-black mr-1">كلمة المرور</Label>
            <Input type="password" placeholder="••••••••" className="text-right h-12 rounded-xl font-bold" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label className="text-primary font-black mr-1">كود الدعوة (اختياري)</Label>
            <Input placeholder="NOK4K9" className="text-right font-mono h-12 rounded-xl border-primary/20" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} />
            <p className="text-[10px] text-muted-foreground font-bold mr-1">استخدام كود الصديق يمنحكما مكافأة فورية!</p>
          </div>
          <Button type="submit" disabled={loading} className="w-full h-16 rounded-2xl font-black text-xl mt-4 shadow-xl shadow-primary/10">
            {loading ? <Loader2 className="animate-spin" /> : "إنشاء حسابي الآن"}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground font-bold">
          لديك حساب؟ <Link href="/login" className="text-primary font-black hover:underline underline-offset-4">سجل دخولك هنا</Link>
        </p>
      </div>
    </div>
  );
}
