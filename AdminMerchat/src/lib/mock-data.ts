export const adminStats = [
  { label: "Total Merchants", value: "124", detail: "+12 this month" },
  { label: "Active Accounts", value: "118", detail: "95.1% activation" },
  { label: "Today's Volume", value: "$482,210", detail: "+8.4% vs yesterday" },
  { label: "Pending Reviews", value: "9", detail: "KYC + payout approvals" },
];

export const merchantStats = [
  { label: "Open Invoices", value: "14", detail: "3 due this week" },
  { label: "Paid This Month", value: "$67,340", detail: "42 successful payments" },
  { label: "Avg Settlement", value: "4h 12m", detail: "Across chain + fiat rails" },
  { label: "Disputes", value: "1", detail: "Under investigation" },
];

export const merchants = [
  { name: "Nova Commerce", email: "ops@novacommerce.io", status: "Active", balance: "$92,430" },
  { name: "Orbit Retail", email: "finance@orbitretail.com", status: "Active", balance: "$48,120" },
  { name: "Blue Harbor", email: "team@blueharbor.co", status: "Under Review", balance: "$9,884" },
  { name: "KitePay Market", email: "admin@kitepay.market", status: "Suspended", balance: "$0" },
];

export const payments = [
  {
    id: "pay_81234",
    merchant: "Nova Commerce",
    amount: "$12,400",
    method: "USDT (TRON)",
    status: "Settled",
    createdAt: "2026-02-25 18:04",
  },
  {
    id: "pay_81236",
    merchant: "Orbit Retail",
    amount: "$5,120",
    method: "Bank Transfer",
    status: "Pending",
    createdAt: "2026-02-25 19:22",
  },
  {
    id: "pay_81244",
    merchant: "Blue Harbor",
    amount: "$2,440",
    method: "BTC",
    status: "Failed",
    createdAt: "2026-02-26 07:10",
  },
];

export const invoices = [
  { id: "inv_0091", customer: "Delta Labs", amount: "$3,200", dueDate: "2026-03-04", status: "Open" },
  { id: "inv_0092", customer: "Ridge Systems", amount: "$980", dueDate: "2026-02-29", status: "Paid" },
  { id: "inv_0093", customer: "Aster Group", amount: "$7,450", dueDate: "2026-03-08", status: "Open" },
  { id: "inv_0094", customer: "Northline", amount: "$1,240", dueDate: "2026-02-23", status: "Overdue" },
];
