import React from 'react';

export const metadata = {
  title: 'Tara - AI Copilot for TallyPrime',
  description: 'Automate Tally with Tara—your conversational accounting copilot. Upload invoices, chat in WhatsApp, and keep ledgers accurate with human-reviewed AI.',
  openGraph: {
    title: 'Tara - AI Copilot for TallyPrime',
    description: 'Automate your Tally workflow with AI-powered accounting.',
    images: [
      {
        url: '/path/to/og-image.png', // Replace with your actual OG image path
        width: 1200,
        height: 630,
        alt: 'Tara AI for TallyPrime',
      },
    ],
  },
};

export default function TaraLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
