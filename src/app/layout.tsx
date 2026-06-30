import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
import './globals.css';

// Tell Font Awesome to skip injecting its CSS at runtime; we import it above
// so the icons don't flash at full size during SSR.
config.autoAddCss = false;
import ClientThemeProvider from './ClientThemeProvider';
import MenuAppBar from '@/components/layout/MenuAppBar'; // make sure this is a client component
import { SystemProvider } from '@/contexts/SystemContext';
import { ConsoleProvider } from '@/contexts/ConsoleContext';
import { SpringTrail } from '@/components/ui/SpringTrail';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Yondra',
  description: 'Created by Serious Sam',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClientThemeProvider>
          <SystemProvider>
            <ConsoleProvider>
              <div className="aero-fixed-bg" aria-hidden>
                <div className="aero-bg__sun" />
                <div className="aero-bg__grid" />
                <div className="aero-bg__scan" />
              </div>
              <MenuAppBar />
              {children}
              <SpringTrail />
            </ConsoleProvider>
          </SystemProvider>
        </ClientThemeProvider>
      </body>
    </html>
  );
}