import '../styles/globals.css';
import { ReactNode } from 'react';
import LayoutShell from '@/components/LayoutShell';

export const metadata = {
  title: 'TaleGrove',
  description: 'AI-powered book recommendation and tracker app',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var storedTheme = localStorage.getItem('theme');
                var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var theme = storedTheme || (systemDark ? 'dark' : 'light');
                
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased transition-colors duration-200">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
