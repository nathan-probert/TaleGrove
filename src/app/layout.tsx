import '../styles/globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'TaleGrove',
  description: 'AI-powered book recommendation and tracker app',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
