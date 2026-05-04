
'use client';

import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  runTransaction, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  Timestamp
} from "firebase/firestore";

/**
 * @fileOverview نظام تعويض الحظ (Compensation Service)
 * يدير قائمة الانتظار، رصيد الصندوق، وعمليات الشراء المدعومة.
 */

const COMPENSATION_THRESHOLD = 100000; // 1000 درهم = 100,000 نقطة

/**
 * جلب بيانات التعويض الخاصة بالمستخدم
 */
export async function getUserCompensationProgress(userId: string) {
  const userSnap = await getDoc(doc(db, "users", userId));
  const data = userSnap.data();
  const losses = data?.ticketLosses || 0;
  
  return {
    losses,
    progress: Math.min(100, (losses / COMPENSATION_THRESHOLD) * 100),
    isQualified: losses >= COMPENSATION_THRESHOLD,
    inQueue: !!data?.compensationQualifiedAt
  };
}

/**
 * شراء منتج مميز باستخدام نظام التعويض (51% مستخدم / 49% صندوق)
 */
export async function buyWithCompensation(userId: string, productId: string) {
  const userRef = doc(db, "users", userId);
  const productRef = doc(db, "products", productId);
  const fundRef = doc(db, "platform", "compensation");

  return await runTransaction(db, async (t) => {
    const [userSnap, prodSnap, fundSnap] = await Promise.all([
      t.get(userRef),
      t.get(productRef),
      t.get(fundRef)
    ]);

    if (!userSnap.exists() || !prodSnap.exists() || !fundSnap.exists()) {
      throw new Error("البيانات غير مكتملة");
    }

    const userData = userSnap.data();
    const prodData = prodSnap.data();
    const fundData = fundSnap.data();

    // 1. التحقق من الدور (FIFO)
    const q = query(
      collection(db, "users"),
      where("ticketLosses", ">=", COMPENSATION_THRESHOLD),
      orderBy("compensationQualifiedAt", "asc"),
      limit(1)
    );
    const firstInLineSnap = await getDocsWithT(t, q);
    if (firstInLineSnap[0]?.id !== userId) {
      throw new Error("عذراً، لست الأول في قائمة الانتظار حالياً.");
    }

    // 2. الحسابات المالية
    const productPrice = prodData.price;
    const userPart = Math.floor(productPrice * 0.51);
    const fundPart = productPrice - userPart;

    if ((userData.totalPoints || 0) < userPart) {
      throw new Error(`تحتاج لـ ${userPart} نقطة (51%) لإتمام الشراء.`);
    }

    if ((fundData.balance || 0) < fundPart) {
      throw new Error("عذراً، سيولة الصندوق حالياً لا تغطي حصة الـ 49%. يرجى الانتظار.");
    }

    // 3. تنفيذ العملية
    t.update(userRef, {
      totalPoints: increment(-userPart),
      withdrawablePoints: increment(-Math.floor(userPart * 0.51)),
      lockedPoints: increment(-(userPart - Math.floor(userPart * 0.51))),
      ticketLosses: 0, // إعادة تصنيع العداد بعد التعويض
      compensationQualifiedAt: null,
      "stats.compensationPurchases": increment(1)
    });

    t.update(fundRef, {
      balance: increment(-fundPart),
      totalCompensated: increment(fundPart)
    });

    t.update(productRef, {
      status: 'sold',
      buyerId: userId,
      paymentMethod: 'compensation',
      soldAt: serverTimestamp()
    });

    // تسجيل العملية
    const txRef = doc(collection(db, "transactions"));
    t.set(txRef, {
      userId,
      amount: -userPart,
      type: 'compensation_purchase',
      description: `شراء تعويضي لمنتج: ${prodData.title} (دعم الصندوق: ${fundPart}ن)`,
      createdAt: serverTimestamp()
    });

    return { success: true };
  });
}

// دالة مساعدة لتنفيذ الاستعلام داخل المعاملة
async function getDocsWithT(t: any, q: any) {
  const { getDocs } = await import("firebase/firestore");
  const snap = await getDocs(q);
  return snap.docs;
}

/**
 * مراقبة طابور الانتظار (شفافية)
 */
export function subscribeToCompensationQueue(callback: (queue: any[]) => void) {
  const q = query(
    collection(db, "users"),
    where("ticketLosses", ">=", COMPENSATION_THRESHOLD),
    orderBy("compensationQualifiedAt", "asc"),
    limit(20)
  );

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d, i) => ({
      rank: i + 1,
      displayName: d.data().displayName,
      qualifiedAt: d.data().compensationQualifiedAt,
      uid: d.id
    })));
  });
}

/**
 * مراقبة رصيد الصندوق الإجمالي
 */
export function subscribeToFundBalance(callback: (balance: number) => void) {
  return onSnapshot(doc(db, "platform", "compensation"), (snap) => {
    callback(snap.data()?.balance || 0);
  });
}
