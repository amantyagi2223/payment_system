export type NavItem = {
  label: string;
  href: string;
};

export const adminNavItems: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Categories", href: "/admin/product-categories" },
  { label: "Currencies", href: "/admin/payment-currencies" },
  { label: "Gas Wallets", href: "/admin/gaswallet" },
  { label: "Fee Wallets", href: "/admin/feewallet" },
  { label: "Order Payouts", href: "/admin/order-payouts" },
  { label: "Merchants", href: "/admin/merchants" },
  { label: "Payments", href: "/admin/payments" },
];

export const merchantNavItems: NavItem[] = [
  { label: "Dashboard", href: "/merchant/dashboard" },
  { label: "Wallets", href: "/merchant/wallets" },
  { label: "Products", href: "/merchant/products" },
  { label: "Order Book", href: "/merchant/orders" },
  { label: "Invoices", href: "/merchant/invoices" },
  { label: "Settings", href: "/merchant/settings" },
];
