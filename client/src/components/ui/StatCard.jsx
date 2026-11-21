export default function StatCard({ label, value, icon: Icon, color = 'blue', trend }) {
  return (
    <div className="card stat-card">
      <div className={`stat-icon ${color}`}><Icon size={22} /></div>
      <div>
        <p className="stat-label">{label}</p>
        <h2 className="stat-value">{value}</h2>
        {trend && <small className="stat-trend">{trend}</small>}
      </div>
    </div>
  );
}
