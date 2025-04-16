import '../styles/globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Bookmate',
  description: 'AI-powered book recommendation app',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">
        <main className="max-w-3xl mx-auto p-4">{children}</main>
      </body>
    </html>
  );
}
