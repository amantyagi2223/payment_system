import type { ReactNode } from "react";

import RoleShell from "@/components/role-shell";
import { adminNavItems } from "@/lib/navigation";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleShell title="Super Admin" roleLabel="Global Operations" navItems={adminNavItems}>
      {children}
    </RoleShell>
  );
}
