
"use client";

import { useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithCredential, getAdditionalUserInfo } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function GoogleOneTap() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (user) return;

    const initializeOneTap = () => {
      if (typeof window !== "undefined" && window.google) {
        window.google.accounts.id.initialize({
          client_id: "211198104435-081t234u86g72dks7a3068fjk66m1088.apps.googleusercontent.com",
          callback: async (response: any) => {
            const credential = GoogleAuthProvider.credential(response.credential);
            try {
              const result = await signInWithCredential(auth, credential);
              const additionalInfo = getAdditionalUserInfo(result);
              const isNewUser = additionalInfo?.isNewUser;
              
              console.log('isNewUser (OneTap):', isNewUser);

              if (isNewUser) {
                const newUser = result.user;
                await setDoc(doc(db, "users", newUser.uid), {
                  uid: newUser.uid,
                  displayName: newUser.displayName || "مستخدم NokTek",
                  email: newUser.email,
                  photoURL: newUser.photoURL || `https://picsum.photos/seed/${newUser.uid}/200/200`,
                  points: 10,
                  createdAt: serverTimestamp(),
                });
                console.log('One Tap: تم إنشاء حساب جديد + 10 نقاط');
                toast({ title: "أهلاً بك في NokTek!", description: "تم إنشاء حسابك وحصلت على 10 نقاط ترحيبية." });
              }

              router.push("/");
            } catch (error: any) {
              console.error("One Tap Login Error Code:", error.code);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed()) {
             console.log('One Tap not displayed:', notification.getNotDisplayedReason());
          } else if (notification.isSkippedMoment()) {
             console.log('One Tap skipped:', notification.getSkippedReason());
          }
        });
      }
    };

    // التحقق من تحميل السكريبت بشكل دوري
    const checkGoogle = setInterval(() => {
      if (window.google) {
        initializeOneTap();
        clearInterval(checkGoogle);
      }
    }, 1000);

    return () => clearInterval(checkGoogle);
  }, [user, router, toast]);

  return null;
}

declare global {
  interface Window {
    google: any;
  }
}
