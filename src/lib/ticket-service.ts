
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
  onSnapshot
} from "firebase/firestore";

/**
 * خوارزمية حساب الحد الأقصى للتذاكر (نظام الموجة)
 */
export function calculateGlobalTicketLimit(productSequence: number): number {
  const cycle = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  return cycle[productSequence % cycle.length];
}

export function calculateUserSpecificLimit(
  productSequence: number, 
  lastWinSequence: number | null, 
  baseLimit: number
): number {
  if (lastWinSequence === null) return baseLimit;
  const diff = productSequence - lastWinSequence;
  if (diff <= 5) return 0;
  const rampUpLimit = diff - 5;
  return Math.min(baseLimit, rampUpLimit);
}

export async function buyProductTickets(userId: string, productId: string, count: number) {
  const userRef = doc(db, "users", userId);
  const productRef = doc(db, "products", productId);
  const statsRef = doc(db, "platform", "stats");

  return await runTransaction(db, async (t) => {
    const userSnap = await t.get(userRef);
    const prodSnap = await t.get(productRef);
    if (!userSnap.exists() || !prodSnap.exists()) throw new Error("البيانات غير موجودة");

    const userData = userSnap.data();
    const prodData = prodSnap.data();

    const productSeq = prodData.sequenceNumber || 0;
    const baseLimit = calculateGlobalTicketLimit(productSeq);
    const userLimit = calculateUserSpecificLimit(productSeq, userData.lastTicketWinSequence || null, baseLimit);

    const currentOwned = (prodData.participants?.[userId] || 0);
    if (currentOwned + count > userLimit) throw new Error(`تجاوزت الحد المسموح لك (${userLimit} تذاكر)`);

    const totalCost = prodData.ticketPrice * count;
    if ((userData.storeWallet_liquid || 0) + (userData.storeWallet_restricted || 0) < totalCost) {
      throw new Error("رصيد محفظة المتجر غير كافي");
    }

    t.update(userRef, {
      storeWallet_liquid: increment(-totalCost), // الخصم من السائل أولاً للتبسيط
      spentPointsThisCycle: increment(totalCost)
    });

    const newSoldTickets = prodData.soldTickets + count;
    const participants = { ...prodData.participants } || {};
    participants[userId] = (participants[userId] || 0) + count;

    t.update(productRef, {
      soldTickets: newSoldTickets,
      participants: participants,
      updatedAt: serverTimestamp()
    });

    if (newSoldTickets >= 120) {
      await drawWinner(t, productRef, participants, productSeq, prodData.price, prodData.ticketPrice);
    }

    return { success: true, newLosses: count * prodData.ticketPrice };
  });
}

async function drawWinner(t: any, productRef: any, participants: any, sequence: number, productPrice: number, ticketPrice: number) {
  const pool: string[] = [];
  const uids = Object.keys(participants);
  
  for (const [uid, count] of Object.entries(participants)) {
    for (let i = 0; i < (count as number); i++) pool.push(uid);
  }

  const winnerId = pool[Math.floor(Math.random() * pool.length)];
  
  // 1. حساب عمولة الصندوق (49% من عمولة الـ 20%)
  const platformFee = productPrice * 0.20;
  const compensationShare = platformFee * 0.49;

  // 2. تحديث الفائز
  t.update(doc(db, "users", winnerId), {
    lastTicketWinSequence: sequence,
    "stats.winsCount": increment(1)
  });

  // 3. تحديث الخاسرين وصندوق التعويض
  const compensationRef = doc(db, "platform", "compensation");
  t.set(compensationRef, { balance: increment(compensationShare) }, { merge: true });

  for (const uid of uids) {
    if (uid === winnerId) continue;
    
    const userRef = doc(db, "users", uid);
    const lostAmount = participants[uid] * ticketPrice;
    
    // زيادة رصيد التعويض والتحقق من التأهل
    t.update(userRef, {
      ticketLosses: increment(lostAmount),
      // إذا وصل للعتبة ولم يكن مؤهلاً مسبقاً، سجل وقت التأهل لـ FIFO
      compensationQualifiedAt: serverTimestamp() 
    });
  }

  t.update(productRef, {
    status: 'completed',
    winnerId: winnerId,
    completedAt: serverTimestamp()
  });

  const notifRef = doc(collection(db, "notifications"));
  t.set(notifRef, {
    userId: winnerId,
    type: 'ticket_win',
    message: `لقد فزت بالمنتج! مبروك 🎉`,
    createdAt: serverTimestamp(),
    read: false
  });
}

export function subscribeToTicketProducts(callback: (products: any[]) => void) {
  const q = query(collection(db, "products"), where("saleType", "==", "tickets"), where("status", "==", "active"));
  return onSnapshot(q, (snap) => {
    let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    data.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    callback(data);
  });
}
