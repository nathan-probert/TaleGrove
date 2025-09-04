"use client";

import Link from "next/link";
import Image from "next/image";
import { Book, Search, Lightbulb, Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const logo_light = "/images/logo_dark.png";
const logo_dark = "/images/logo_light.png";

export default function Header() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    setMounted(true);
    // This now matches the server-side calculation
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.theme = newDarkMode ? "dark" : "light";
    document.documentElement.classList.toggle("dark", newDarkMode);
  };

  if (!mounted) return null;

  return (
    <header className="bg-background text-lg sm:text-xl">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between py-4">
          <Link
            href="/"
            className="flex items-center justify-center gap-4 hover:opacity-80 transition-opacity"
          >
            {/* Light theme logo */}
            <Image
              src={logo_light}
              alt="TaleGrove Logo"
              width={44}
              height={44}
              className="object-contain block dark:hidden -mt-2 w-auto h-auto"
              priority
            />
            {/* Dark theme logo */}
            <Image
              src={logo_dark}
              alt="TaleGrove Logo (Dark)"
              width={44}
              height={44}
              className="object-contain hidden dark:block -mt-2 w-auto h-auto"
              priority
            />
            <h1 className="text-3xl font-bold text-primary flex items-center">
              TaleGrove
            </h1>
          </Link>

          <div className="flex items-center space-x-6 mt-4 sm:mt-0">
            <nav className="flex items-center space-x-6">
              <NavLink
                href="/books"
                icon={<Book size={26} />}
                active={pathname?.startsWith("/books")}
              >
                My Books
              </NavLink>
              <NavLink
                href="/search"
                icon={<Search size={26} />}
                active={pathname?.startsWith("/search")}
              >
                Search
              </NavLink>
              <NavLink
                href="/discover"
                icon={<Lightbulb size={26} />}
                active={pathname?.startsWith("/discover")}
              >
                Discover
              </NavLink>
            </nav>

            <button
              onClick={toggleTheme}
              className="p-3 rounded-lg hover:bg-muted "
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <Sun size={26} className="text-foreground/80" />
              ) : (
                <Moon size={26} className="text-foreground/80" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  icon,
  children,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center space-x-3 px-6 py-3 rounded-xl text-xl  ${active
        ? "bg-primary/10 text-primary"
        : "hover:bg-muted text-foreground/80 hover:text-foreground"
        }`}
    >
      {icon}
      <span className="hidden sm:inline-block font-semibold">{children}</span>
    </Link>
  );
}
