'use client';

import { db } from "@/lib/firebase";
import { doc, getDoc, runTransaction, serverTimestamp, Timestamp, increment } from "firebase/firestore";
import { calculatePostScore } from "./engagement-service";

/**
 * دالة تعزيز المنشور باستخدام الرصيد الإعلاني
 */
export async function boostPost(postId: string, userId: string, budget: number, multiplier: number) {
  // تحديث القاعدة للسماح بـ 2x فقط كما هو مطلوب
  if (multiplier !== 2) throw new Error("المضاعف المسموح به حالياً هو 2x فقط");
  
  const minBudget = 50;
  if (budget < minBudget) throw new Error("الحد الأدنى للتعزيز هو 50 نقطة");

  await runTransaction(db, async (transaction) => {
    const userRef = doc(db, "users", userId);
    const postRef = doc(db, "posts", postId);
    
    const userDoc = await transaction.get(userRef);
    const postDoc = await transaction.get(postRef);
    
    if (!userDoc.exists()) throw new Error("User not found");
    if (!postDoc.exists()) throw new Error("Post not found");

    const postData = postDoc.data();
    if (postData.authorId !== userId) throw new Error("فقط صاحب المنشور يقدر يعززه");
    if (postData.isBoosted) throw new Error("المنشور معزز مسبقاً");

    const adBalance = userDoc.data().advertisingBalance || userDoc.data().adBalance || 0;
    if (adBalance < budget) throw new Error("الرصيد الإعلاني غير كافي");

    // حساب عدد التفاعلات المتوقع
    const baseRewardPerInteraction = 21; // متوسط (مشاهدة 15 + لايك 1 + تعليق 2 + مشاركة 3)
    const boostedRewardPerInteraction = baseRewardPerInteraction * multiplier;
    const targetInteractions = Math.floor(budget / boostedRewardPerInteraction);

    transaction.update(userRef, {
      advertisingBalance: increment(-budget),
      adBalance: increment(-budget),
      spentPointsThisCycle: increment(budget) // تتبع الاستهلاك لعمولة الـ 5%
    });

    // تحديث السكور الخاص بالمنشور لرفعه في الخلاصة
    const updatedPostData = { ...postData, isBoosted: true };
    const newScore = calculatePostScore(updatedPostData);

    transaction.update(postRef, {
      isBoosted: true,
      engagementScore: newScore,
      boostConfig: {
        totalBudget: budget,
        remainingBudget: budget,
        rewardMultiplier: multiplier,
        targetInteractions,
        currentInteractions: 0,
        boostedAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
  });

  return { success: true };
}

/**
 * تحويل من المحفظة المغلقة للإعلاني
 */
export async function convertToAdBalance(userId: string, amount: number) {
  await runTransaction(db, async (t) => {
    const userRef = doc(db, "users", userId);
    const userSnap = await t.get(userRef);
    
    if (!userSnap.exists()) throw new Error("User not found");
    const currentLocked = userSnap.data().lockedPoints || 0;
    
    if (currentLocked < amount) throw new Error("رصيدك المجمد غير كافي");

    t.update(userRef, {
      lockedPoints: increment(-amount),
      advertisingBalance: increment(amount)
    });
  });
  return { success: true };
}
