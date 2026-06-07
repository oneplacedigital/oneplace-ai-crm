import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pipora — Your AI Pipeline. Built to Convert.',
  description:
    'Pipora is the AI-powered CRM that captures Meta leads, automates WhatsApp + email, and turns conversations into customers. Built for education, coaching, and digital marketing businesses.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
