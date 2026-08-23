import { updateUserAccessAction } from '@/actions/admin-user.actions';
import { getAdminUsers } from '@/lib/admin-api';

interface AdminUsersPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const [users, query] = await Promise.all([getAdminUsers(), searchParams]);
  return (
    <section className="section admin-list-page">
      <p className="eyebrow"><span /> Access control</p>
      <h1>Pengguna</h1>
      {query.error && <p className="form-error admin-message">{query.error}</p>}
      <div className="data-table user-admin-table">
        {users.map((user) => (
          <form action={updateUserAccessAction.bind(null, user.id)} key={user.id}>
            <span><strong>{user.fullName}</strong><small>{user.email} · {user.phone ?? 'Tanpa telepon'}</small></span>
            <span>{user._count.orders} order · {user._count.quotations} quotation</span>
            <select name="role" defaultValue={user.role} aria-label={`Role ${user.fullName}`}>
              <option value="CUSTOMER">Customer</option><option value="STAFF">Staff</option><option value="ADMIN">Admin</option><option value="SUPER_ADMIN">Super admin</option>
            </select>
            <label className="check-field"><input type="checkbox" name="isActive" defaultChecked={user.isActive} /> Aktif</label>
            <button>Simpan</button>
          </form>
        ))}
      </div>
    </section>
  );
}
