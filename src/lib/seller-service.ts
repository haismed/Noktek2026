
'use client';

import { db, storage } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  increment, 
  query, 
  where, 
  onSnapshot,
  getDoc,
  runTransaction
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export interface ProductData {
  title: string;
  description: string;
  price: number;
  stock: number;
  merchantId: string;
  saleType?: 'direct' | 'tickets';
  category?: string;
  imageUrls?: string[];
  videoUrl?: string | null;
}

/**
 * دالة إضافة منتج جديد مع الميديا ونوع البيع
 */
export async function addProduct(
  data: ProductData, 
  images: File[], 
  video: File | null
) {
  const productRef = collection(db, "products");
  const statsRef = doc(db, "platform", "stats");
  
  // 1. رفع الصور
  const imageUrls: string[] = [];
  for (let i = 0; i < images.length; i++) {
    const sRef = ref(storage, `products/${data.merchantId}/${Date.now()}_img_${i}`);
    const snap = await uploadBytes(sRef, images[i]);
    const url = await getDownloadURL(snap.ref);
    imageUrls.push(url);
  }

  // 2. رفع الفيديو
  let videoUrl = null;
  if (video) {
    const vRef = ref(storage, `products/${data.merchantId}/${Date.now()}_video`);
    const vSnap = await uploadBytes(vRef, video);
    videoUrl = await getDownloadURL(vSnap.ref);
  }

  // 3. جلب التسلسل للمنتج (للتذاكر)
  let sequenceNumber = 0;
  if (data.saleType === 'tickets') {
    await runTransaction(db, async (t) => {
      const sSnap = await t.get(statsRef);
      const current = sSnap.exists() ? sSnap.data().ticketProductCount || 0 : 0;
      sequenceNumber = current + 1;
      t.update(statsRef, { ticketProductCount: sequenceNumber });
    });
  }

  // 4. حفظ المستند في Firestore
  const docRef = await addDoc(productRef, {
    ...data,
    imageUrls,
    videoUrl,
    saleType: data.saleType || 'direct',
    ticketPrice: data.saleType === 'tickets' ? Math.ceil(data.price / 100) : 0,
    totalTickets: data.saleType === 'tickets' ? 120 : 0,
    soldTickets: 0,
    sequenceNumber,
    status: 'active',
    salesCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  // 5. تحديث عداد منتجات التاجر
  await updateDoc(doc(db, "users", data.merchantId), {
    "stats.productsCount": increment(1)
  });

  return docRef.id;
}

/**
 * مراقبة منتجات التاجر
 */
export function subscribeToMerchantProducts(merchantId: string, callback: (products: any[]) => void) {
  const q = query(
    collection(db, "products"),
    where("merchantId", "==", merchantId)
  );

  return onSnapshot(q, (snap) => {
    let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    data.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    callback(data);
  });
}

/**
 * جلب كافة المنتجات النشطة للسوق
 */
export function subscribeToAllProducts(callback: (products: any[]) => void) {
  const q = query(
    collection(db, "products"),
    where("status", "==", "active")
  );

  return onSnapshot(q, (snap) => {
    let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    data.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    callback(data);
  });
}

/**
 * توليد منتجات تجريبية للتاجر
 */
export async function seedDemoProducts(merchantId: string) {
  const demoData = [
    { title: "ساعة ذكية Ultra G9", price: 450, stock: 10, desc: "ساعة ذكية متطورة تدعم المكالمات والقياسات الصحية.", img: "https://images.unsplash.com/photo-1544117518-2b462f588bbc?q=80&w=600&auto=format" },
    { title: "سماعات Pro Buds", price: 280, stock: 15, desc: "سماعات لاسلكية مع عزل ضوضاء فائق الجودة.", img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format" },
    { title: "باور بانك 20,000mAh", price: 320, stock: 8, desc: "شاحن متنقل سريع يدعم كافة الهواتف الذكية.", img: "https://images.unsplash.com/photo-1609091839311-d53681962025?q=80&w=600&auto=format" },
    { title: "مكبر صوت بلوتوث RGB", price: 190, stock: 20, desc: "سبيكر لاسلكي مع إضاءة متفاعلة مع الموسيقى.", img: "https://images.unsplash.com/photo-1608156639585-34054e815958?q=80&w=600&auto=format" },
    { title: "لوحة مفاتيح ميكانيكية", price: 550, stock: 5, desc: "كيبورد ألعاب احترافي بلمسة معدنية فاخرة.", img: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?q=80&w=600&auto=format" }
  ];

  for (const item of demoData) {
    await addDoc(collection(db, "products"), {
      title: item.title,
      description: item.desc,
      price: item.price,
      stock: item.stock,
      merchantId,
      imageUrls: [item.img],
      status: 'active',
      saleType: 'direct',
      salesCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  await updateDoc(doc(db, "users", merchantId), {
    "stats.productsCount": increment(5)
  });
}
