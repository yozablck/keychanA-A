"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers3, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const Navbar = () => {
  const pathname = usePathname();
  const [logoError, setLogoError] = useState(false);
  
  const isActive = (path: string) => pathname === path;
  
  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Generate", path: "/generate" },
    { name: "Collections", path: "/collections" },
    { name: "Pricing", path: "/pricing" },
  ];

  return (
    <nav className="bg-[#FAF9F6] border-b border-border shadow-sm">
      <div className="container mx-auto px-6">
        <div className="flex items-center h-16 relative">
          {/* Logo - Left */}
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="relative w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors overflow-hidden flex items-center justify-center">
              {!logoError ? (
                <img
                  src="/logo.png"
                  alt="KEYCHAN Logo"
                  className="w-full h-full object-contain p-1"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <Layers3 className="w-6 h-6 text-primary" />
              )}
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">KEYCHAN</span>
          </Link>

          {/* Nav Links - Center */}
          <div className="flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive(link.path)
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Person Icon - Right */}
          <div className="ml-auto flex-shrink-0">
            <Button 
              variant="outline" 
              size="icon" 
              className="border-primary text-primary hover:bg-primary hover:text-white rounded-full"
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
