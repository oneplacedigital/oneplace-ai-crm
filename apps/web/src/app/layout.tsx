import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ONEPLACE AI CRM',
  description: 'AI Admissions CRM & Marketing Automation for Education Businesses',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
