/** Oznaka "Admin" pored imena člana tima. */
export default function AdminBadge({ role }: { role?: string | null }) {
  if (role !== 'admin') return null;
  return (
    <span className="admin-badge" title="Član tima Boulevard of Cards">
      Admin
    </span>
  );
}
