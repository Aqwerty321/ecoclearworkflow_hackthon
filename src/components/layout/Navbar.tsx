
"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LogOut, Shield, Github, Menu } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MobileSidebar } from "./Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold ring-2 ring-primary/20">
      {initials}
    </div>
  );
}

export function Navbar() {
  const { currentUser, logout } = useAppStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (!currentUser) return null;

  return (
    <nav className="h-16 flex items-center justify-between px-4 md:px-6 fixed top-0 w-full z-50 glass border-b border-border/50">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <MobileSidebar />
          </SheetContent>
        </Sheet>
        <Shield className="h-6 w-6 text-primary transition-transform duration-300 hover:scale-110" />
        <Link href="/dashboard" className="font-headline font-bold text-xl tracking-tight">
          <span className="text-gradient-primary">EcoClear</span>
          <span className="text-muted-foreground font-light ml-1">Workflow</span>
        </Link>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex-col text-right mr-1 hidden sm:flex">
          <span className="text-sm font-medium leading-tight">{currentUser.name}</span>
          <span className="text-[11px] text-muted-foreground capitalize">{currentUser.role}</span>
        </div>
        <UserAvatar name={currentUser.name} />
        
        <div className="flex items-center gap-0.5 ml-1 border-l pl-2 border-border/50">
          <ThemeToggle />
          <Button variant="ghost" size="icon" asChild title="GitHub Profile" className="h-9 w-9">
            <a href="https://github.com/Aqwerty321/ecoclearworkflow_hackthon" target="_blank" rel="noopener noreferrer">
              <Github className="h-4 w-4" />
            </a>
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="h-9 w-9 text-muted-foreground hover:text-destructive">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
