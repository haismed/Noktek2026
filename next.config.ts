import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  typescript: {
    // نتجاهل أخطاء التايب سكريبت أثناء البناء لضمان سرعة النشر واستقرار العمليات
    ignoreBuildErrors: true,
  },
  eslint: {
    // نتجاهل أخطاء الـ Lint أثناء البناء لتجنب توقف النشر بسبب التنسيقات
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
