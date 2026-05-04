'use client';

import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, getDoc, collection, query, where, getDocs, limit, Timestamp } from "firebase/firestore";

/**
 * وظيفة التنبيهات الإدارية الداخلية للنظام
 * تقوم بتسجيل التحذيرات الهامة في سجلات النظام لمراقبتها من قبل الإدارة
 */
export async function sendAlert(message: string) {
  // يتم تسجيل التنبيهات حالياً في سجلات الخادم والكونسول
  console.log("System Security Alert:", message);
}

/**
 * جلب إحصائيات الإطلاق الحية ومراقبتها
 */
export function subscribeToLaunchStats(callback: (stats: any) => void) {
  let lastInflationAlert = 0;
  let lastFraudAlert = 0;

  return onSnapshot(doc(db, "platform", "stats"), (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      // حساب التضخم اللحظي
      const mint = data.mintRateHour || 0;
      const burn = data.burnRateHour || 0;
      const total = data.totalSupply || 22000000;
      const inflation = ((mint - burn) / total) * 100;
      const inflationRate = inflation.toFixed(4);

      // 1. مراقبة التضخم (> 10%)
      if (Number(inflationRate) > 10 && (Date.now() - lastInflationAlert > 3600000)) {
        sendAlert(`خطر تضخم مرتفع! النسبة الحالية: ${inflationRate}%`);
        lastInflationAlert = Date.now();
      }

      // 2. مراقبة محاولات الاحتيال
      if (data.fraudAttemptsToday > 100 && (Date.now() - lastFraudAlert > 600000)) {
        sendAlert(`رصد نشاط مشبوه! تم تسجيل أكثر من ${data.fraudAttemptsToday} محاولة احتيال.`);
        lastFraudAlert = Date.now();
      }

      callback({
        ...data,
        inflation: inflationRate,
        isHealthy: Number(inflationRate) >= -2 && Number(inflationRate) <= 2,
        serverStatus: data.latency < 500 ? 'healthy' : data.latency < 800 ? 'warning' : 'danger'
      });
    }
  });
}

/**
 * تفعيل/إلغاء وضع الطوارئ (Kill Switch)
 */
export async function toggleEmergencyMode(status: boolean) {
  const ref = doc(db, "platform", "config");
  await updateDoc(ref, {
    emergencyMode: status,
    updatedAt: Timestamp.now()
  });

  if (status) {
    await sendAlert(`تنبيه أمني: تم تفعيل وضع الطوارئ الكامل (KILL SWITCH) من قبل الإدارة.`);
  } else {
    await sendAlert(`تنبيه: تم استئناف العمليات المالية وإغلاق وضع الطوارئ.`);
  }
}

/**
 * التحقق من وضع الطوارئ الحالي للنظام
 */
export async function isEmergencyMode() {
  const ref = doc(db, "platform", "config");
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().emergencyMode : false;
}
