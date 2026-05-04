'use client';

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, runTransaction, Timestamp } from "firebase/firestore";
import { ANTI_ABUSE_LIMITS, ANTI_FRAUD_LIMITS, ECONOMIC_MODEL } from "./platform-service";
import { getDeviceFingerprint } from "./fingerprint";
import { updatePostInCache } from "./feed-service";

export interface EngagementData {
  userId: string;
  postId: string;
  secondsSpent: number;
  tier1_reached?: boolean;
  tier2_reached?: boolean;
  tier3_reached?: boolean;
  tier4_reached?: boolean;
  likeRewarded?: boolean;
  commentRewarded?: boolean;
  shareRewarded?: boolean;
  commentType?: 'BASIC' | 'PREMIUM';
  share_click_time?: number;
}

/**
 * خوارزمية حساب السكور لترتيب المنشورات في الخلاصة
 */
export function calculatePostScore(post: any): number {
  const likes = post.likeCount || 0;
  const comments = post.commentCount || 0;
  const shares = post.shareCount || 0;
  const watchTime = post.totalSecondsSpent || 0;
  const boosted = post.isBoosted || false;

  let score = (likes * 1) + (comments * 3) + (shares * 5) + (watchTime * 0.1);
  
  if (boosted) score += 1000;

  const createdAt = post.createdAt;
  if (createdAt) {
    const createdMillis = createdAt instanceof Timestamp ? createdAt.toMillis() : (createdAt.seconds ? createdAt.seconds * 1000 : Date.now());
    const hoursSincePost = (Date.now() - createdMillis) / (1000 * 60 * 60);
    score -= (hoursSincePost * 10);
  }

  return score;
}

/**
 * التحقق من جودة التعليق وشروط المكافأة
 */
export function validateComment(text: string, postData: any): { valid: boolean; reason?: string; type?: 'BASIC' | 'PREMIUM' } {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  
  if (words.length < 3) return { valid: false, reason: "التعليق قصير جداً، اكتب 3 كلمات على الأقل." };
  
  const hasCharSpam = /(.)\1{4,}/.test(text);
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  if (hasCharSpam || uniqueWords.size < words.length * 0.5) {
    return { valid: false, reason: "التعليق يحتوي على تكرار أو سبام." };
  }

  const meaningfulWords = words.filter(w => w.length > 2 && !w.startsWith('#'));
  if (meaningfulWords.length < 2) return { valid: false, reason: "التعليق لا يحتوي على كلمات كافية ذات معنى." };

  if (postData.campaignType === "PREMIUM" && postData.requiredHashtag) {
    const hasRequired = text.toLowerCase().includes(postData.requiredHashtag.toLowerCase());
    if (hasRequired) return { valid: true, type: "PREMIUM" };
  }
  
  return { valid: true, type: "BASIC" };
}

/**
 * تهيئة مستند التفاعل
 */
export async function initEngagement(postId: string, userId: string) {
  const engRef = doc(db, "engagements", `${postId}_${userId}`);
  const snap = await getDoc(engRef);
  if (!snap.exists()) {
    const deviceId = await getDeviceFingerprint();
    await setDoc(engRef, {
      userId,
      postId,
      deviceId,
      secondsSpent: 0,
      createdAt: serverTimestamp()
    });
  }
}

/**
 * جلب بيانات التفاعل
 */
export async function getEngagement(postId: string, userId: string): Promise<EngagementData | null> {
  const engRef = doc(db, "engagements", `${postId}_${userId}`);
  const snap = await getDoc(engRef);
  return snap.exists() ? snap.data() as EngagementData : null;
}

/**
 * تسجيل وقت الضغط على المشاركة
 */
export async function recordShareClick(postId: string, userId: string) {
  const engRef = doc(db, "engagements", `${postId}_${userId}`);
  await setDoc(engRef, {
    share_click_time: Date.now()
  }, { merge: true });
}

/**
 * صرف مكافآت التفاعل وتوزيع الأرباح (51% ناشر، 29% متفاعل، 20% منصة)
 */
export async function rewardEngagement(
  userId: string, 
  postId: string, 
  type: 'view' | 'like' | 'comment' | 'share' | 'tier2' | 'tier3' | 'tier4' | 'comment_premium', 
  totalAmount: number,
  seconds: number
) {
  const deviceId = await getDeviceFingerprint();
  const today = new Date().toISOString().split('T')[0];

  return await runTransaction(db, async (t) => {
    const userRef = doc(db, "users", userId);
    const postRef = doc(db, "posts", postId);
    const engRef = doc(db, "engagements", `${postId}_${userId}`);
    const platformRef = doc(db, "platform", "stats");
    const configRef = doc(db, "platform", "config");

    const [userSnap, postSnap, engSnap, platformSnap, configSnap] = await Promise.all([
      t.get(userRef),
      t.get(postRef),
      t.get(engRef),
      t.get(platformRef),
      t.get(configRef)
    ]);

    if (!userSnap.exists() || !postSnap.exists()) {
      return { success: false, message: "بيانات غير موجودة" };
    }

    if (configSnap.exists() && configSnap.data().emergencyMode) {
      return { success: false, message: "المنصة في وضع الطوارئ" };
    }

    const userData = userSnap.data();
    const postData = postSnap.data();

    if (userId === postData.authorId) {
      return { success: false, message: "لا يمكن الربح من منشورك الخاص" };
    }

    const trustScore = userData.trustScore ?? 100;
    const isSuspicious = trustScore < ANTI_FRAUD_LIMITS.MIN_TRUST_SCORE_FOR_REWARDS;
    
    const daily = userData.dailyEngagement || { date: today, secondsUsed: 0 };
    if (daily.date === today && daily.secondsUsed >= ANTI_ABUSE_LIMITS.MAX_WATCH_SECONDS_24H) {
      return { success: false, message: "وصلت للحد اليومي للمشاهدة" };
    }

    const engData = engSnap.exists() ? engSnap.data() : {};
    if (type === 'view' && engData.tier1_reached) return { success: false, message: "تم حصد المكافأة مسبقاً" };
    if (type === 'like' && engData.likeRewarded) return { success: false, message: "تم حصد المكافأة مسبقاً" };
    if (type.includes('comment') && engData.commentRewarded) return { success: false, message: "تم حصد المكافأة مسبقاً" };
    if (type === 'share' && engData.shareRewarded) return { success: false, message: "تم حصد المكافأة مسبقاً" };

    let multiplier = 1;
    if (postData?.isBoosted && postData.boostConfig?.remainingBudget > 0) {
      multiplier = postData.boostConfig.rewardMultiplier || 1;
    }

    const finalTotalValue = isSuspicious ? 0 : (totalAmount * multiplier);

    const publisherPoints = finalTotalValue * ECONOMIC_MODEL.PUBLISHER_PERCENT;
    const interactorPoints = finalTotalValue * ECONOMIC_MODEL.INTERACTOR_PERCENT;
    const platformProfit = finalTotalValue * ECONOMIC_MODEL.PLATFORM_PERCENT;

    const engUpdate: any = { 
      secondsSpent: increment(seconds),
      userId: userId,
      postId: postId,
      deviceId: deviceId,
      updatedAt: serverTimestamp()
    };
    
    if (type === 'view') engUpdate.tier1_reached = true;
    if (type === 'tier2') engUpdate.tier2_reached = true;
    if (type === 'tier3') engUpdate.tier3_reached = true;
    if (type === 'tier4') engUpdate.tier4_reached = true;
    if (type === 'like') engUpdate.likeRewarded = true;
    if (type.includes('comment')) {
      engUpdate.commentRewarded = true;
      engUpdate.commentType = type === 'comment_premium' ? 'PREMIUM' : 'BASIC';
    }
    if (type === 'share') engUpdate.shareRewarded = true;
    
    t.set(engRef, engUpdate, { merge: true });

    const interactorWithdrawable = interactorPoints * ECONOMIC_MODEL.CASHABLE_PERCENT;
    const interactorLocked = interactorPoints * ECONOMIC_MODEL.LOCKED_PERCENT;
    
    t.update(userRef, {
      totalPoints: increment(interactorPoints),
      withdrawablePoints: increment(interactorWithdrawable),
      lockedPoints: increment(interactorLocked),
      totalEarned: increment(interactorPoints),
      "dailyEngagement.date": today,
      "dailyEngagement.secondsUsed": (daily.date === today ? daily.secondsUsed : 0) + seconds,
      "dailyEngagement.pointsEarnedToday": increment(interactorPoints)
    });

    const publisherRef = doc(db, "users", postData.authorId);
    const publisherWithdrawable = publisherPoints * ECONOMIC_MODEL.CASHABLE_PERCENT;
    const publisherLocked = publisherPoints * ECONOMIC_MODEL.LOCKED_PERCENT;

    t.update(publisherRef, {
      totalPoints: increment(publisherPoints),
      withdrawablePoints: increment(publisherWithdrawable),
      lockedPoints: increment(publisherLocked),
      totalEarned: increment(publisherPoints),
      totalEarnedFromPosts: increment(publisherPoints)
    });

    const postUpdates: any = {
      totalSecondsSpent: increment(seconds),
      totalRevenueGenerated: increment(finalTotalValue)
    };
    if (type === 'like') postUpdates.likeCount = increment(1);
    if (type.includes('comment')) postUpdates.commentCount = increment(1);
    if (type === 'share') postUpdates.shareCount = increment(1);

    if (multiplier > 1 && !isSuspicious) {
      postUpdates['boostConfig.remainingBudget'] = increment(-finalTotalValue);
      postUpdates['boostConfig.currentInteractions'] = increment(1);
    }

    const currentPostState = { ...postData, ...postUpdates };
    postUpdates.engagementScore = calculatePostScore(currentPostState);

    t.update(postRef, postUpdates);

    const platformUpdate: any = {
      updatedAt: serverTimestamp(),
      distributedRewards: increment(finalTotalValue),
      platformEarnings: increment(platformProfit)
    };
    t.update(platformRef, platformUpdate);

    return { success: true, interactorReward: interactorPoints, publisherReward: publisherPoints };
  });
}