"use client";

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // No-op: initial theme is set by the <head> script in layout.tsx
  // If you add a theme toggle, update the theme class and localStorage here.
  return <>{children}</>;
}
