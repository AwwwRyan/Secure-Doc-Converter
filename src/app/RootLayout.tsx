import { Outlet, ScrollRestoration } from 'react-router';
import { AppBar } from '@/components/AppBar';
import { Footer } from '@/components/Footer';

export function RootLayout() {
  return (
    <div className="flex min-h-full flex-col bg-bg">
      <AppBar />
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-7 py-7">
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </div>
  );
}
