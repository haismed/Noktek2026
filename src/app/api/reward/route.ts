import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
// ملاحظة: لازم تضبط Prisma بعدين. الحين خلنا نشغل الـ API

export async function POST(req: NextRequest) {
  try {
    const { userId, postId, type } = await req.json()
    
    if (!userId ||!postId || type!== 'view') {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    // مؤقتا: نرجع rewarded بعد 45 ثانية للتجربة
    // بعد ما نضبط Prisma بنشيل هذا ونحط الكود الكامل
    return NextResponse.json({ 
      status: 'rewarded', 
      newBalance: 10.81,
      message: 'تم احتساب 0.01 نقطة' 
    })

  } catch (error) {
    return NextResponse.json({ error: 'خطأ في السيرفر' }, { status: 500 })
  }
}
