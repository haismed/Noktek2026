
import type {Metadata, Viewport} from 'next';
import './globals.css';
import { AuthProvider } from '@/context/auth-context';
import { Toaster } from '@/components/ui/toaster';
import EconomyBar from '@/components/EconomyBar';

export const metadata: Metadata = {
  title: 'NokTek - أول منصة عربية لاقتصاد التفاعل',
  description: 'شارك، تفاعل، واربح. NokTek تحول وقتك وتفاعلك الاجتماعي إلى قيمة نقدية حقيقية.',
  keywords: 'ربح من الانترنت, NokTek, نكتك, اقتصاد التفاعل, عملات رقمية عربية, تسويق عبر المؤثرين',
  openGraph: {
    title: 'NokTek - Interact • Earn • Enjoy',
    description: 'انضم لثورة التفاعل الاجتماعي العربي واربح نقاطاً قابلة للسحب.',
    type: 'website',
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@200;300;400;500;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen pb-20 bg-background text-foreground">
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <EconomyBar />
            <main className="flex-1">
              {children}
            </main>
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
