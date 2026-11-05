export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}
export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card p-5 fade-in">
      <div className="text-xs text-[var(--muted)]  ">{label}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
      {hint && <div className="text-xs text-[var(--muted)] mt-1">{hint}</div>}
    </div>
  );
}
