import type { Metadata } from 'next';
import { Playfair_Display, Roboto, Inter} from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const display = Playfair_Display({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-display', display: 'swap' });
const sans = Roboto({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  title: { default: "Lu's Shoe Farm", template: "%s | Lu's Shoe Farm" },
  description: 'Shoes for every step, delivered across Lagos and Nigeria.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
