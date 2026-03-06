
"use client";

import { useAppStore } from "@/lib/store";
import { 
  LayoutDashboard, 
  FilePlus, 
  Search, 
  Users, 
  Settings, 
  ClipboardCheck, 
  Calendar,
  Layers,
  Briefcase
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { currentUser } = useAppStore();
  const pathname = usePathname();

  if (!currentUser) return null;

  const menuItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", roles: ["Admin", "Project Proponent", "Scrutiny Team", "MoM Team"] },
    { label: "My Applications", icon: Briefcase, href: "/dashboard/my-applications", roles: ["Project Proponent"] },
    { label: "New Application", icon: FilePlus, href: "/dashboard/proponent/new", roles: ["Project Proponent", "Admin"] },
    { label: "Scrutiny Pool", icon: ClipboardCheck, href: "/dashboard/scrutiny", roles: ["Scrutiny Team", "Admin"] },
    { label: "Meeting Desk", icon: Calendar, href: "/dashboard/mom", roles: ["MoM Team", "Admin"] },
    { label: "User Management", icon: Users, href: "/dashboard/admin/users", roles: ["Admin"] },
    { label: "Sector Management", icon: Layers, href: "/dashboard/admin/sectors", roles: ["Admin"] },
    { label: "System Templates", icon: Settings, href: "/dashboard/admin/templates", roles: ["Admin"] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(currentUser.role));

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground fixed left-0 top-16 bottom-0 overflow-y-auto border-r border-sidebar-border hidden md:block">
      <div className="p-4 flex flex-col gap-1">
        {filteredItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              pathname === item.href 
                ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
