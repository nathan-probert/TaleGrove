"use client";

import Link from "next/link";
import { Book, Search, Lightbulb, Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Header() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    setMounted(true);
    // This now matches the server-side calculation
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.theme = newDarkMode ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', newDarkMode);
  };

  if (!mounted) return null;

  return (
    <header className="bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between py-4">
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <img
              src="/images/colour_logo.png"
              alt="TaleGrove Logo"
              width={36}
              height={36}
              className="object-contain dark:invert"
              style={{ maxHeight: 36 }}
            />
            <h1 className="text-2xl font-bold text-primary">
              TaleGrove
            </h1>
          </Link>

          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <nav className="flex items-center space-x-4">
              <NavLink href="/books" icon={<Book size={20} />} active={pathname?.startsWith('/books')}>
                My Books
              </NavLink>
              <NavLink href="/search" icon={<Search size={20} />} active={pathname?.startsWith('/search')}>
                Search
              </NavLink>
              <NavLink href="/discover" icon={<Lightbulb size={20} />} active={pathname?.startsWith('/discover')}>
                Discover
              </NavLink>
            </nav>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <Sun size={20} className="text-foreground/80" />
              ) : (
                <Moon size={20} className="text-foreground/80" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}


function NavLink({ href, icon, children, active }: {
  href: string,
  icon: React.ReactNode,
  children: React.ReactNode,
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${active
          ? 'bg-primary/10 text-primary'
          : 'hover:bg-muted text-foreground/80 hover:text-foreground'
        }`}
    >
      {icon}
      <span className="hidden sm:inline-block">{children}</span>
    </Link>
  );
}