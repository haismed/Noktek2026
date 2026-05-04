'use client';

import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, increment, serverTimestamp, collection, query, where, getDocs, runTransaction } from "firebase/firestore";
import { trackPlatformActivity } from "./platform-service";

/**
 * وظيفة موحدة للتحويل من الرصيد القابل للسحب (7% عمولة)
 */
export async function handleInternalTransfer(
  userId: string, 
  amount: number, 
  target: 'store' | 'friend' | 'ads',
  targetUserId?: string
) {
  const userRef = doc(db, "users", userId);
  
  return await runTransaction(db, async (t) => {
    const snap = await t.get(userRef);
    if (!snap.exists()) throw new Error("المستخدم غير موجود");
    
    const user = snap.data();
    const currentTransfers = user.storeTransferCount || 0;
    
    if (currentTransfers >= 3) {
      throw new Error("وصلت للحد الأقصى لعمليات التحويل الداخلي (3 مرات فقط)");
    }

    if (amount <= 0) throw new Error("المبلغ يجب أن يكون أكبر من صفر");
    if ((user.withdrawablePoints || 0) < amount) throw new Error("رصيدك القابل للسحب غير كافي");

    const commissionRate = 0.07;
    const fee = Math.ceil(amount * commissionRate);
    const netAmount = amount - fee;

    const updates: any = {
      withdrawablePoints: increment(-amount),
      totalPoints: increment(-fee),
      storeTransferCount: increment(1),
      spentPointsThisCycle: increment(amount)
    };

    if (target === 'store') {
      updates.storeWallet_liquid = increment(netAmount);
    } else if (target === 'ads') {
      updates.advertisingBalance = increment(netAmount);
    } else if (target === 'friend' && targetUserId) {
      const friendRef = doc(db, "users", targetUserId);
      t.update(friendRef, {
        totalPoints: increment(netAmount),
        withdrawablePoints: increment(netAmount * 0.51),
        lockedPoints: increment(netAmount * 0.49)
      });
    }

    t.update(userRef, updates);

    const txRef = doc(collection(db, "transactions"));
    t.set(txRef, {
      userId,
      amount: -amount,
      netAmount: netAmount,
      fee: fee,
      type: `internal_transfer_${target}`,
      targetUserId: targetUserId || null,
      description: `تحويل ${amount} ن من القابل للسحب إلى ${target === 'store' ? 'المتجر' : target === 'ads' ? 'رصيد الإعلان' : 'صديق'}`,
      createdAt: serverTimestamp()
    });

    await trackPlatformActivity('fee', fee, userId, `رسوم تحويل داخلي (${target})`);

    return { success: true, netAmount, fee };
  });
}

/**
 * وظيفة موحدة للتحويل من الرصيد المجمد (20% عمولة)
 */
export async function handleLockedTransfer(
  userId: string,
  amount: number,
  target: 'store' | 'boost' | 'ads'
) {
  const userRef = doc(db, "users", userId);

  return await runTransaction(db, async (t) => {
    const snap = await t.get(userRef);
    if (!snap.exists()) throw new Error("المستخدم غير موجود");

    const user = snap.data();
    const currentLockedTransfers = user.lockedTransferCount || 0;

    if (currentLockedTransfers >= 3) {
      throw new Error("وصلت للحد الأقصى لتحويلات الرصيد المجمد (3 مرات فقط)");
    }

    if (amount <= 0) throw new Error("المبلغ يجب أن يكون أكبر من صفر");
    if ((user.lockedPoints || 0) < amount) throw new Error("رصيدك المجمد غير كافي");

    const commissionRate = 0.20; // 20% عمولة ثابتة للمجمد
    const fee = Math.ceil(amount * commissionRate);
    const netAmount = amount - fee;

    const updates: any = {
      lockedPoints: increment(-amount),
      totalPoints: increment(-fee),
      lockedTransferCount: increment(1),
      spentPointsThisCycle: increment(amount)
    };

    if (target === 'store') {
      updates.storeWallet_restricted = increment(netAmount);
    } else {
      // للتعزيز أو رصيد الإعلان كلاهما يذهب لـ advertisingBalance
      updates.advertisingBalance = increment(netAmount);
    }

    t.update(userRef, updates);

    // تسجيل العملية
    const txRef = doc(collection(db, "transactions"));
    t.set(txRef, {
      userId,
      amount: -amount,
      netAmount: netAmount,
      fee: fee,
      type: `locked_transfer_${target}`,
      description: `تحويل ${amount} ن من المجمد إلى ${target === 'store' ? 'المتجر' : target === 'boost' ? 'التعزيز' : 'رصيد الإعلان'} (عمولة 20%)`,
      createdAt: serverTimestamp()
    });

    await trackPlatformActivity('fee', fee, userId, `رسوم تحويل من المجمد (${target})`);

    return { success: true, netAmount, fee };
  });
}

export async function convertLockedToStore(userId: string, amount: number) {
  return handleLockedTransfer(userId, amount, 'store');
}

export async function withdrawPoints(userId: string, points: number, bankInfo: any) {
  const userRef = doc(db, "users", userId);
  
  return await runTransaction(db, async (t) => {
    const userSnap = await t.get(userRef);
    if (!userSnap.exists()) throw new Error("المستخدم غير موجود");
    
    if ((userSnap.data().withdrawablePoints || 0) < points) {
      throw new Error("رصيدك القابل للسحب غير كافي");
    }

    const withdrawalRef = doc(collection(db, "withdrawals"));
    t.set(withdrawalRef, {
      userId,
      points,
      bankName: bankInfo.bankName,
      accountName: bankInfo.accountName,
      rib: bankInfo.rib,
      status: 'pending',
      netMAD: (points * 0.93 * 0.01).toFixed(2),
      createdAt: serverTimestamp()
    });

    t.update(userRef, {
      withdrawablePoints: increment(-points),
      totalPoints: increment(-points),
      bankInfo: bankInfo
    });
  });
}

export async function buyPoints(userId: string, madAmount: number) {
  const statsSnap = await getDoc(doc(db, "platform", "stats"));
  const pointValue = statsSnap.data()?.pointValueMAD || 0.01;
  const points = Math.floor(madAmount / pointValue);

  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    advertisingBalance: increment(points),
    purchasedPointsThisCycle: increment(points)
  });

  return { points };
}

export async function convertLockedToAd(userId: string, points: number) {
  // هذه الدالة القديمة سيتم استبدالها تدريجياً بـ handleLockedTransfer
  // ولكن سنبقيها للتوافق مع صفحة /wallet/convert إذا لزم الأمر
  const bonus = Math.floor(points * 0.10);
  const net = points + bonus;
  
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    lockedPoints: increment(-points),
    advertisingBalance: increment(net),
    totalPoints: increment(bonus)
  });
  
  return { net, bonus };
}

export async function startNewCycleLogic(adminId: string, nextValue: number) {
  const statsRef = doc(db, "platform", "stats");
  
  await runTransaction(db, async (t) => {
    const snap = await t.get(statsRef);
    if (!snap.exists()) throw new Error("Stats not found");
    
    t.update(statsRef, {
      currentCycle: increment(1),
      distributedRewards: 0,
      pointValueMAD: nextValue,
      withdrawalOpen: false,
      rewardPoolClosed: false,
      updatedAt: serverTimestamp()
    });

    const txRef = doc(collection(db, "transactions"));
    t.set(txRef, {
      userId: adminId,
      type: 'cycle_start',
      description: `بدء دورة اقتصادية جديدة بالسعر: ${nextValue} د.م.`,
      createdAt: serverTimestamp()
    });
  });
}
