import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Medical Supply OMS',
  description: 'Medical Supply Order Management System - Internal Tool',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
