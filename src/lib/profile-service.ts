
'use client';

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, collection, query, where, getDocs, runTransaction } from "firebase/firestore";

export type FriendshipStatus = "none" | "pending" | "accepted" | "blocked" | "self";

/**
 * جلب بروفايل مستخدم مع تطبيق فلاتر الخصوصية والتحقق من حالة الصداقة
 */
export async function getUserProfile(targetUserId: string, viewerId?: string) {
  const userRef = doc(db, "users", targetUserId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) return null;
  const userData = userSnap.data();
  
  const privacy = userData.privacy || {
    profileVisibility: "public",
    showPoints: "friends",
    showPosts: "public",
    showEarnings: false,
    allowFriendRequests: true
  };

  const stats = userData.stats || {
    friendsCount: 0,
    postsCount: 0,
    totalLikes: 0
  };

  // تحديد حالة الصداقة
  let friendshipStatus: FriendshipStatus = "none";
  let requestedBy = "";
  let requestId = "";

  if (viewerId === targetUserId) {
    friendshipStatus = "self";
  } else if (viewerId) {
    // 1. تحقق من وجود صداقة مؤكدة
    const friendshipId = [viewerId, targetUserId].sort().join('_');
    const friendSnap = await getDoc(doc(db, "friendships", friendshipId));
    
    if (friendSnap.exists()) {
      friendshipStatus = "accepted";
    } else {
      // 2. تحقق من وجود طلبات معلقة
      const q = query(
        collection(db, "friendRequests"),
        where("status", "==", "pending"),
        where("senderId", "in", [viewerId, targetUserId]),
        where("receiverId", "in", [viewerId, targetUserId])
      );
      const requestSnap = await getDocs(q);
      if (!requestSnap.empty) {
        const reqDoc = requestSnap.docs[0];
        const reqData = reqDoc.data();
        friendshipStatus = "pending";
        requestId = reqDoc.id;
        requestedBy = reqData.senderId;
      }
    }
  }

  const canView = (setting: string) => {
    if (friendshipStatus === "self") return true;
    if (setting === "public") return true;
    if (setting === "friends" && friendshipStatus === "accepted") return true;
    return false;
  };

  return {
    profile: {
      uid: userData.uid,
      displayName: userData.displayName,
      username: userData.username || userData.displayName.toLowerCase().replace(/\s/g, '_'),
      photoURL: userData.photoURL,
      bio: canView(privacy.profileVisibility) ? (userData.bio || "") : "محتوى خاص",
      isVerified: userData.isVerified || false,
      isCreator: userData.isCreator || false,
      stats: stats,
      joinedAt: userData.createdAt,
      totalPoints: canView(privacy.showPoints) ? (userData.totalPoints || 0) : null,
      withdrawablePoints: friendshipStatus === "self" ? userData.withdrawablePoints : null,
      friendshipStatus,
      requestedBy,
      requestId,
      allowFriendRequests: privacy.allowFriendRequests !== false
    },
    privacy
  };
}

/**
 * إرسال طلب صداقة (تستخدم المنطق الموحد في friends.ts)
 */
export async function sendFriendRequest(fromId: string, toId: string) {
  const { sendFriendRequest: sendLogic } = await import("./friends");
  // نحتاج لجلب بيانات المستلم للعرض في الإشعارات
  const targetSnap = await getDoc(doc(db, "users", toId));
  const targetData = targetSnap.data();
  return await sendLogic(toId, targetData?.displayName || "مستخدم", targetData?.photoURL || "");
}

/**
 * قبول طلب صداقة (تستخدم المنطق الموحد في friends.ts)
 */
export async function acceptFriendRequest(requestId: string, senderId: string) {
  const { acceptFriendRequest: acceptLogic } = await import("./friends");
  return await acceptLogic(requestId, senderId);
}

/**
 * تحديث إعدادات الخصوصية
 */
export async function updatePrivacySettings(userId: string, settings: any) {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { privacy: settings });
}
