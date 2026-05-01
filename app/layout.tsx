import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { NavBar } from '@/components/NavBar';
import { ToastContainer } from '@/components/ui/toast';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'Workout Tracker',
  description: 'Личный трекер тренировок',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <NavBar />
          <main className="container mx-auto px-4 py-6 max-w-2xl pb-24">
            {children}
          </main>
        </div>
        <ToastContainer />
      </body>
    </html>
  );
}
