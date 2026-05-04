import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, increment, serverTimestamp, addDoc } from "firebase/firestore";
import { trackPlatformActivity } from "./platform-service";

/**
 * توليد كود دعوة فريد
 */
export function generateReferralCode(displayName: string) {
  const base = (displayName || "USER").slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${base}${random}`;
}

/**
 * البحث عن مستخدم بواسطة كود الإحالة
 */
export async function getUserByReferralCode(code: string) {
  if (!code) return null;
  const q = query(collection(db, "users"), where("referralCode", "==", code.toUpperCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/**
 * تنفيذ مكافأة الإحالة مع تقسيم 51/49
 */
export async function processReferralReward(inviterId: string, inviteeId: string, inviterName: string, inviteeName: string) {
  // تحديث المكافأة إلى 25 نقطة بناءً على الطلب الجديد
  const INVITER_REWARD = 25;
  const INVITEE_REWARD = 25;

  // 1. مكافأة الداعي (Inviter)
  const inviterRef = doc(db, "users", inviterId);
  const actualInviterReward = await trackPlatformActivity('reward', INVITER_REWARD, inviterId, `مكافأة دعوة الصديق: ${inviteeName}`);
  
  if (actualInviterReward > 0) {
    const withdrawablePart = Math.floor(actualInviterReward * 0.51);
    const lockedPart = actualInviterReward - withdrawablePart;

    await updateDoc(inviterRef, {
      totalPoints: increment(actualInviterReward),
      totalEarned: increment(actualInviterReward),
      totalReferralEarnings: increment(actualInviterReward),
      referralsCount: increment(1),
      withdrawablePoints: increment(withdrawablePart),
      lockedPoints: increment(lockedPart)
    });
  }

  // 2. مكافأة المدعو (Invitee)
  const inviteeRef = doc(db, "users", inviteeId);
  const actualInviteeReward = await trackPlatformActivity('reward', INVITEE_REWARD, inviteeId, `مكافأة استخدام كود دعوة: ${inviterName}`);

  if (actualInviteeReward > 0) {
    const withdrawablePart = Math.floor(actualInviteeReward * 0.51);
    const lockedPart = actualInviteeReward - withdrawablePart;

    await updateDoc(inviteeRef, {
      totalPoints: increment(actualInviteeReward),
      totalEarned: increment(actualInviteeReward),
      withdrawablePoints: increment(withdrawablePart),
      lockedPoints: increment(lockedPart),
      referredBy: inviterId
    });
  }
}
