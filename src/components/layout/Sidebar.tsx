
"use client";

import { useAppStore } from "@/lib/store";
import { 
  LayoutDashboard, 
  FilePlus, 
  Users, 
  Settings, 
  ClipboardCheck, 
  Calendar,
  Layers,
  Briefcase,
  Shield,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type MenuItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  roles: string[];
  section?: string;
};

const menuItems: MenuItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", roles: ["Admin", "Project Proponent", "Scrutiny Team", "MoM Team"], section: "Main" },
  { label: "My Applications", icon: Briefcase, href: "/dashboard/my-applications", roles: ["Project Proponent"], section: "Main" },
  { label: "New Application", icon: FilePlus, href: "/dashboard/proponent/new", roles: ["Project Proponent", "Admin"], section: "Main" },
  { label: "Scrutiny Pool", icon: ClipboardCheck, href: "/dashboard/scrutiny", roles: ["Scrutiny Team", "Admin"], section: "Review" },
  { label: "Meeting Desk", icon: Calendar, href: "/dashboard/mom", roles: ["MoM Team", "Admin"], section: "Review" },
  { label: "User Management", icon: Users, href: "/dashboard/admin/users", roles: ["Admin"], section: "Administration" },
  { label: "Sector Management", icon: Layers, href: "/dashboard/admin/sectors", roles: ["Admin"], section: "Administration" },
  { label: "System Templates", icon: Settings, href: "/dashboard/admin/templates", roles: ["Admin"], section: "Administration" },
];

function SidebarNav({ className }: { className?: string }) {
  const { currentUser } = useAppStore();
  const pathname = usePathname();

  if (!currentUser) return null;

  const filteredItems = menuItems.filter(item => item.roles.includes(currentUser.role));
  
  // Group by section
  const sections: Record<string, MenuItem[]> = {};
  filteredItems.forEach(item => {
    const section = item.section || "Other";
    if (!sections[section]) sections[section] = [];
    sections[section].push(item);
  });

  return (
    <div className={cn("px-3 py-4 flex flex-col gap-1", className)}>
      {Object.entries(sections).map(([section, items], sectionIdx) => (
        <div key={section}>
          {sectionIdx > 0 && (
            <div className="my-3 px-3">
              <div className="h-px bg-sidebar-border" />
              <p className="text-[10px] uppercase tracking-wider text-sidebar-muted font-semibold mt-3 mb-1 px-1">
                {section}
              </p>
            </div>
          )}
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-sidebar-primary-foreground rounded-r-full" />
                )}
                <item.icon className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-transform duration-200",
                  !isActive && "group-hover:scale-110"
                )} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function SidebarUserProfile() {
  const { currentUser } = useAppStore();
  if (!currentUser) return null;

  const initials = currentUser.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  const roleColors: Record<string, string> = {
    Admin: "bg-amber-500/20 text-amber-300",
    "Project Proponent": "bg-blue-500/20 text-blue-300",
    "Scrutiny Team": "bg-emerald-500/20 text-emerald-300",
    "MoM Team": "bg-purple-500/20 text-purple-300",
  };

  return (
    <div className="p-3 border-t border-sidebar-border">
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="h-9 w-9 rounded-full bg-sidebar-primary/30 text-sidebar-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-sidebar-foreground truncate">{currentUser.name}</p>
          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", roleColors[currentUser.role] || "bg-slate-500/20 text-slate-300")}>
            {currentUser.role}
          </span>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { currentUser } = useAppStore();
  if (!currentUser) return null;

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground fixed left-0 top-16 bottom-0 overflow-y-auto border-r border-sidebar-border hidden md:flex md:flex-col">
      <div className="flex-1 overflow-y-auto">
        <SidebarNav />
      </div>
      <SidebarUserProfile />
    </aside>
  );
}

export function MobileSidebar() {
  return (
    <div className="bg-sidebar text-sidebar-foreground h-full overflow-y-auto flex flex-col">
      <div className="flex items-center gap-2 p-4 border-b border-sidebar-border">
        <Shield className="h-5 w-5 text-sidebar-primary" />
        <span className="font-headline font-bold text-sidebar-foreground">EcoClear</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarNav />
      </div>
      <SidebarUserProfile />
    </div>
  );
}
