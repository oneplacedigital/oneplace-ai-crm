import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Klozent — The AI CRM That Closes For You',
  description:
    'Klozent is the AI-powered CRM that auto-converts leads, automates WhatsApp + email follow-ups, and closes deals on autopilot. Built for fast-growing sales teams worldwide.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
