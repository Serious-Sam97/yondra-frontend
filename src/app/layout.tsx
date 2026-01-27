import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import ClientThemeProvider from './ClientThemeProvider';
import MenuAppBar from '@/components/layout/MenuAppBar'; // make sure this is a client component

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
          <MenuAppBar />
          {children}
        </ClientThemeProvider>
      </body>
    </html>
  );
}