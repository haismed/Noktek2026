
'use client';

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, query, orderBy, limit, serverTimestamp, Timestamp } from "firebase/firestore";
import { calculatePostScore } from "./engagement-service";

/**
 * Applies diversity logic: No more than 2 consecutive posts from the same author
 */
function applyDiversity(posts: any[]) {
  const result: any[] = [];
  const remainingPosts = [...posts];

  while (remainingPosts.length > 0) {
    let found = false;
    for (let i = 0; i < remainingPosts.length; i++) {
      const post = remainingPosts[i];
      const lastAuthor = result.length > 0 ? result[result.length - 1].authorId : null;
      const secondLastAuthor = result.length > 1 ? result[result.length - 2].authorId : null;

      if (post.authorId === lastAuthor && post.authorId === secondLastAuthor) {
        continue;
      }

      result.push(remainingPosts.splice(i, 1)[0]);
      found = true;
      break;
    }
    if (!found) result.push(remainingPosts.shift());
  }
  return result;
}

/**
 * Refreshes the shared general feed cache in Firestore
 * Reducing 1000s of reads to just 1 read per user
 */
export async function refreshGeneralFeedCache() {
  const cacheRef = doc(db, "platform", "general_feed_cache");
  const cacheSnap = await getDoc(cacheRef);
  
  if (cacheSnap.exists()) {
    const data = cacheSnap.data();
    const lastUpdate = data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : 0;
    const ageSeconds = (Date.now() - lastUpdate) / 1000;
    
    // Cache is fresh (less than 60 seconds), no need to heavy lift
    if (ageSeconds < 60) return data.posts;
  }

  // Cache expired or missing: Heavy lift (Calculate new feed)
  const q = query(
    collection(db, "posts"),
    orderBy("engagementScore", "desc"),
    limit(150)
  );
  
  const snap = await getDocsWithEngagementUpdate(q);
  const diverseFeed = applyDiversity(snap).slice(0, 100);

  // Save back to shared cache
  await setDoc(cacheRef, {
    posts: diverseFeed,
    updatedAt: serverTimestamp(),
    count: diverseFeed.length
  });

  return diverseFeed;
}

async function getDocsWithEngagementUpdate(q: any) {
  const { getDocs } = await import("firebase/firestore");
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    // Update score locally for the cache if needed
    return { id: d.id, ...data };
  });
}

/**
 * Updates a specific post within the shared cache doc
 * Ensures counters are live without re-fetching everything
 */
export async function updatePostInCache(postId: string, updates: any) {
  const cacheRef = doc(db, "platform", "general_feed_cache");
  const cacheSnap = await getDoc(cacheRef);
  
  if (!cacheSnap.exists()) return;
  
  const data = cacheSnap.data();
  const posts = data.posts || [];
  const index = posts.findIndex((p: any) => p.id === postId);
  
  if (index !== -1) {
    const updatedPosts = [...posts];
    updatedPosts[index] = { ...updatedPosts[index], ...updates };
    
    await setDoc(cacheRef, {
      ...data,
      posts: updatedPosts
    }, { merge: true });
  }
}
