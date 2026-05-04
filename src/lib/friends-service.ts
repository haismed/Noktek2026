
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp, writeBatch, doc, deleteDoc } from "firebase/firestore";

/**
 * وظيفة للتحقق من إمكانية إرسال طلب صداقة جديد بناءً على القواعد:
 * 1. حد أقصى 50 طلباً معلقاً.
 * 2. الحذف التلقائي للطلبات التي تجاوزت 7 أيام.
 */
export async function canSendFriendRequest(uid: string) {
  try {
    // 1. اجلب كل الطلبات المعلقة (pending) التي أرسلها المستخدم
    const q = query(
      collection(db, "friendRequests"),
      where("senderId", "==", uid),
      where("status", "==", "pending")
    );
    
    const querySnapshot = await getDocs(q);
    const now = Date.now();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - sevenDaysInMs;

    let pendingCount = 0;
    const batch = writeBatch(db);
    let hasDeletions = false;

    // 2. فحص الطلبات وحذف القديمة (> 7 أيام)
    querySnapshot.forEach((document) => {
      const data = document.data();
      const createdAt = data.createdAt;
      const millis = createdAt instanceof Timestamp 
        ? createdAt.toMillis() 
        : (createdAt?.seconds ? createdAt.seconds * 1000 : now);

      if (millis < sevenDaysAgo) {
        // طلب قديم جداً - احذفه آلياً لتحرير مساحة
        batch.delete(doc(db, "friendRequests", document.id));
        hasDeletions = true;
      } else {
        // طلب لا يزال صالحاً ومعلقاً
        pendingCount++;
      }
    });

    // تنفيذ الحذف للطلبات القديمة إن وجدت
    if (hasDeletions) {
      await batch.commit();
    }

    // 3. التحقق من الحد الأقصى (50 طلباً)
    if (pendingCount >= 50) {
      return {
        allowed: false,
        reason: "limit_reached",
        message: `وصلت للحد الأقصى للطلبات المعلقة (50). انتظر قبول أصدقائك لطلباتك الحالية لتتمكن من إرسال المزيد.`
      };
    }

    return { allowed: true, currentPending: pendingCount };
  } catch (error) {
    console.error("Error checking friend request quota:", error);
    return { allowed: true }; // السماح في حال حدوث خطأ تقني لعدم تعطيل المستخدم
  }
}
