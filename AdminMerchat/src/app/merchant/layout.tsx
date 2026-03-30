import type { ReactNode } from "react";

import RoleShell from "@/components/role-shell";
import { merchantNavItems } from "@/lib/navigation";

export default function MerchantLayout({ children }: { children: ReactNode }) {
  return (
    <RoleShell title="Merchant Portal" roleLabel="Business Operations" navItems={merchantNavItems}>
      {children}
    </RoleShell>
  );
}
