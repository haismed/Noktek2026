
'use client';
import { db, auth } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp, 
  runTransaction, 
  onSnapshot, 
  orderBy, 
  limit,
  setDoc,
  increment,
  getDoc
} from 'firebase/firestore';
import { canSendFriendRequest } from './friends-service';

/**
 * إرسال طلب صداقة مع التحقق من الكوتا والقواعد الجديدة
 */
export const sendFriendRequest = async (receiverId: string, receiverName: string, receiverPhoto: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("سجل دخول أولاً");
  if (user.uid === receiverId) throw new Error("لا يمكنك إضافة نفسك");
  
  // 1. التحقق من القواعد (الحد 50 والتنظيف التلقائي لـ 7 أيام)
  const check = await canSendFriendRequest(user.uid);
  if (!check.allowed) {
    throw new Error(check.message);
  }

  // 2. التحقق من الصداقة الحالية
  const friendshipId = [user.uid, receiverId].sort().join('_');
  const friendSnap = await getDoc(doc(db, 'friendships', friendshipId));
  if (friendSnap.exists()) throw new Error("أنتما أصدقاء بالفعل");
  
  // 3. التحقق من وجود طلب معلق حالي لهذا الشخص تحديداً
  const qExisting = query(collection(db, 'friendRequests'), 
    where('senderId', '==', user.uid), 
    where('receiverId', '==', receiverId), 
    where('status', '==', 'pending')
  );
  const existingSnap = await getDocs(qExisting);
  if (!existingSnap.empty) throw new Error("تم إرسال الطلب لهذا المستخدم مسبقاً وهو معلق حالياً");

  // 4. إضافة الطلب الجديد
  const requestRef = await addDoc(collection(db, 'friendRequests'), {
    senderId: user.uid,
    receiverId,
    senderName: user.displayName || 'مستخدم',
    senderPhoto: user.photoURL || '',
    status: 'pending',
    createdAt: serverTimestamp()
  });

  // 5. إرسال إشعار
  await addDoc(collection(db, 'notifications'), {
    userId: receiverId,
    type: 'friend_request',
    requestId: requestRef.id,
    fromUserId: user.uid,
    fromUserName: user.displayName || 'مستخدم',
    fromUserPhoto: user.photoURL || '',
    message: `أرسل لك طلب صداقة`,
    read: false,
    createdAt: serverTimestamp()
  });
};

/**
 * قبول طلب الصداقة
 */
export const acceptFriendRequest = async (requestId: string, senderId: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("سجل دخول أولاً");
  
  const friendshipId = [senderId, user.uid].sort().join('_');

  await runTransaction(db, async (transaction) => {
    // 1. تحديث حالة الطلب
    transaction.update(doc(db, 'friendRequests', requestId), { status: 'accepted' });
    
    // 2. إنشاء علاقة الصداقة
    const friendshipRef = doc(db, 'friendships', friendshipId);
    transaction.set(friendshipRef, {
      users: [senderId, user.uid],
      createdAt: serverTimestamp()
    });

    // 3. تحديث عدادات الأصدقاء
    const senderRef = doc(db, 'users', senderId);
    const receiverRef = doc(db, 'users', user.uid);
    
    transaction.update(senderRef, { "stats.friendsCount": increment(1) });
    transaction.update(receiverRef, { "stats.friendsCount": increment(1) });

    // 4. إرسال إشعار القبول
    const notifRef = doc(collection(db, 'notifications'));
    transaction.set(notifRef, {
      userId: senderId,
      type: 'friend_accepted',
      fromUserId: user.uid,
      fromUserName: user.displayName || 'مستخدم',
      fromUserPhoto: user.photoURL || '',
      message: `قبل طلب صداقتك`,
      read: false,
      createdAt: serverTimestamp()
    });
  });
};

/**
 * رفض طلب الصداقة
 */
export const rejectFriendRequest = async (requestId: string) => {
  await updateDoc(doc(db, 'friendRequests', requestId), { status: 'rejected' });
};

/**
 * حذف صديق
 */
export const removeFriend = async (friendId: string) => {
  const user = auth.currentUser;
  if (!user) return;
  
  const friendshipId = [user.uid, friendId].sort().join('_');
  const friendshipRef = doc(db, 'friendships', friendshipId);
  
  await deleteDoc(friendshipRef);
  // تحديث عدادات الأصدقاء
  await updateDoc(doc(db, "users", user.uid), { "stats.friendsCount": increment(-1) });
  await updateDoc(doc(db, "users", friendId), { "stats.friendsCount": increment(-1) });
};

/**
 * مراقبة حالة الصداقة (Real-time)
 */
export const subscribeToFriendshipStatus = (targetUserId: string, callback: (status: 'none' | 'pending_sent' | 'pending_received' | 'accepted') => void) => {
  const user = auth.currentUser;
  if (!user) return () => {};

  return onSnapshot(doc(db, 'friendships', [user.uid, targetUserId].sort().join('_')), (snap) => {
    if (snap.exists()) {
      callback('accepted');
    } else {
      const q = query(collection(db, 'friendRequests'), where('status', '==', 'pending'));
      return onSnapshot(q, (rSnap) => {
        const sent = rSnap.docs.find(d => d.data().senderId === user.uid && d.data().receiverId === targetUserId);
        const received = rSnap.docs.find(d => d.data().senderId === targetUserId && d.data().receiverId === user.uid);
        if (sent) callback('pending_sent');
        else if (received) callback('pending_received');
        else callback('none');
      });
    }
  });
};
