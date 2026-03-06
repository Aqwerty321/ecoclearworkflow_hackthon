
"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Github } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function Navbar() {
  const { currentUser, logout } = useAppStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (!currentUser) return null;

  return (
    <nav className="border-b bg-white h-16 flex items-center justify-between px-6 fixed top-0 w-full z-50">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <Link href="/dashboard" className="font-headline font-bold text-xl text-primary tracking-tight">
          EcoClear Workflow
        </Link>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex flex-col text-right mr-2">
          <span className="text-sm font-medium">{currentUser.name}</span>
          <span className="text-xs text-muted-foreground">{currentUser.role}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild title="GitHub Profile">
            <a href="https://github.com/lalitheswar09-data" target="_blank" rel="noopener noreferrer">
              <Github className="h-5 w-5" />
            </a>
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
