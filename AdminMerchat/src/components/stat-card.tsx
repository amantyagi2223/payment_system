type StatCardProps = {
  label: string;
  value: string;
  detail: string;
};

export default function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <article className="animate-rise-in rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
      <div className="h-1 w-14 rounded-full bg-gradient-to-r from-cyan-600 to-teal-600" />
      <p className="mt-3 text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{detail}</p>
    </article>
  );
}
