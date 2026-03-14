
import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Toaster } from '@/components/ui/toaster';
import { StoreProvider } from '@/lib/StoreContext';
import { ThemeProvider } from 'next-themes';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'EcoClear Workflow - Environmental Clearance System',
  description: 'Streamlined environmental application and review workflow',
  verification: {
    google: 'b22c15bd5fae4289',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="font-body antialiased min-h-screen bg-background transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <StoreProvider>
            <Navbar />
            <Sidebar />
            <main className="md:pl-64 pt-16 min-h-screen">
              <div className="p-4 md:p-6">
                {children}
              </div>
            </main>
            <Toaster />
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
