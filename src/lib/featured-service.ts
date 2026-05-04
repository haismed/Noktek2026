
import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, serverTimestamp, Timestamp } from "firebase/firestore";

/**
 * دالة للتحقق مما إذا كان بإمكان المستخدم تمييز منشور
 */
export function canUserFeaturePost(lastFeaturedAt: any): boolean {
  if (!lastFeaturedAt) return true;
  const now = Date.now();
  const lastTime = lastFeaturedAt instanceof Timestamp ? lastFeaturedAt.toMillis() : (lastFeaturedAt.seconds ? lastFeaturedAt.seconds * 1000 : 0);
  const hours24 = 24 * 60 * 60 * 1000;
  return (now - lastTime) >= hours24;
}

/**
 * دالة لحساب الوقت المتبقي لفتح ميزة التمييز
 */
export function getRemainingTime(lastFeaturedAt: any): string {
  if (!lastFeaturedAt) return 'متاح الآن';
  const now = Date.now();
  const lastTime = lastFeaturedAt instanceof Timestamp ? lastFeaturedAt.toMillis() : (lastFeaturedAt.seconds ? lastFeaturedAt.seconds * 1000 : 0);
  const nextTime = lastTime + (24 * 60 * 60 * 1000);
  const remaining = nextTime - now;
  
  if (remaining <= 0) return 'متاح الآن';
  
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  return `متاح بعد ${hours} ساعة و ${minutes} دقيقة`;
}

/**
 * دالة تمييز المنشور
 */
export async function featurePost(postId: string, userId: string) {
  const postRef = doc(db, "posts", postId);
  const userRef = doc(db, "users", userId);

  // تحديث المنشور
  await updateDoc(postRef, {
    isFeatured: true,
    featuredAt: serverTimestamp(),
    featuredBy: userId,
    boostScore: increment(100), // دفعة في الخوارزمية
    featuredBoost: 100
  });

  // تحديث بيانات المستخدم
  await updateDoc(userRef, {
    lastFeaturedPostAt: serverTimestamp(),
    featuredPostsCount: increment(1)
  });

  return { success: true };
}
