import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, collection, addDoc, Timestamp, writeBatch } from "firebase/firestore";

const TOTAL_SUPPLY = 22000000;
const REWARD_POOL = TOTAL_SUPPLY * 0.49;

export const ANTI_ABUSE_LIMITS = {
  MAX_WATCH_SECONDS_24H: 28800,     // 8 hours
};

export const ANTI_FRAUD_LIMITS = {
  MIN_TRUST_SCORE_FOR_REWARDS: 50,  // الحد الأدنى لدرجة الثقة للحصول على مكافآت
};

export const COMMENT_REWARDS = {
  BASIC: 2,
  PREMIUM: 4
};

/**
 * الثوابت الاقتصادية للمنصة
 */
export const ECONOMIC_MODEL = {
  PUBLISHER_PERCENT: 0.51,    // 51% للناشر
  INTERACTOR_PERCENT: 0.29,   // 29% للمتفاعل
  PLATFORM_PERCENT: 0.20,     // 20% ربح المنصة
  CASHABLE_PERCENT: 0.51,    // 51% من الربح كاش
  LOCKED_PERCENT: 0.49       // 49% من الربح مجمد
};

/**
 * تهيئة إحصائيات المنصة عند أول تشغيل
 */
export async function initPlatformStats() {
  try {
    const ref = doc(db, "platform", "stats");
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        totalSupply: TOTAL_SUPPLY,
        rewardPool: REWARD_POOL,
        pointValueMAD: 0.01,
        distributedRewards: 0,
        platformEarnings: 0,
        activeUsers: 450,
        currentCycle: 1,
        withdrawalOpen: false,
        rewardPoolClosed: false,
        emergencyMode: false,
        updatedAt: serverTimestamp()
      });
      console.log("Platform Stats Initialized ✅");
    }
    
    // تهيئة إعدادات الطوارئ
    const configRef = doc(db, "platform", "config");
    const configSnap = await getDoc(configRef);
    if (!configSnap.exists()) {
      await setDoc(configRef, {
        emergencyMode: false,
        updatedAt: serverTimestamp()
      });
    }
  } catch (e) {
    console.error("Platform initialization failed (check rules):", e);
  }
}

export async function isRewardPoolOpen() {
  const ref = doc(db, "platform", "stats");
  const snap = await getDoc(ref);
  if (!snap.exists()) return true;
  const data = snap.data();
  
  if (data.distributedRewards >= data.rewardPool) {
    if (!data.rewardPoolClosed) {
      await updateDoc(ref, { rewardPoolClosed: true, withdrawalOpen: true });
    }
    return false;
  }
  
  return !data.rewardPoolClosed;
}

export async function trackPlatformActivity(type: 'user' | 'post' | 'reward' | 'fee', amount: number = 0, userId?: string, description?: string) {
  const ref = doc(db, "platform", "stats");
  const updates: any = { updatedAt: serverTimestamp() };

  if (type === 'user') updates.activeUsers = increment(1);
  if (type === 'reward') {
    updates.distributedRewards = increment(amount);
  }
  if (type === 'fee') {
    updates.platformEarnings = increment(amount);
  }
  
  await updateDoc(ref, updates);
  if (type === 'reward') await isRewardPoolOpen();

  return amount;
}

export async function seedPlatformData(adminId: string) {
  const batch = writeBatch(db);
  const postsRef = collection(db, "posts");
  
  const topics = ['tech', 'ai', 'business', 'marketing'];
  const titles = ['مستقبل الذكاء الاصطناعي', 'كيف تبني مشروعك الصغير', 'أسرار النجاح في NokTek', 'تكنولوجيا الهواتف 2026'];
  const contents = [
    'منصة NokTek هي ثورة في عالم اقتصاد التفاعل الحقيقي. استعد للمستقبل!',
    'النجاح لا يأتي بالصدفة، بل بالتفاعل المستمر وبناء شبكة قوية من الأصدقاء.',
    'هل جربت نظام التذاكر في المتجر؟ إنها الطريقة الأمتع لربح منتجات حقيقية.',
    'التدريب المستمر هو مفتاح التميز في المجالات التقنية الحديثة.'
  ];

  for (let i = 0; i < 5; i++) {
    const newPostRef = doc(postsRef);
    batch.set(newPostRef, {
      title: titles[i % titles.length],
      text: contents[i % contents.length],
      authorId: adminId,
      authorName: "NokTek Admin",
      authorPhotoURL: "https://picsum.photos/seed/admin/200/200",
      createdAt: serverTimestamp(),
      likeCount: Math.floor(Math.random() * 50),
      commentCount: Math.floor(Math.random() * 10),
      shareCount: Math.floor(Math.random() * 5),
      topicId: topics[i % topics.length],
      topicName: topics[i % topics.length],
      engagementScore: Math.floor(Math.random() * 1000),
      isFeatured: i === 0
    });
  }

  await batch.commit();
  return true;
}
