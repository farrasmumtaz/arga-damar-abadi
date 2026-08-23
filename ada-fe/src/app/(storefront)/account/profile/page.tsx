import { redirect } from 'next/navigation';
import {
  deleteAddressAction,
  saveAddressAction,
  setDefaultAddressAction,
  updateProfileAction,
} from '@/actions/account.actions';
import { AccountNav } from '@/components/account-nav';
import { getAddresses, getProfile } from '@/lib/user-api';

interface ProfilePageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const user = await getProfile();
  if (!user) redirect('/login?returnTo=%2Faccount%2Fprofile');

  const [addresses, query] = await Promise.all([
    getAddresses(),
    searchParams,
  ]);

  return (
    <section className="container section account-page">
      <div className="account-heading">
        <div>
          <p className="eyebrow"><span /> Customer account</p>
          <h1>Profil & alamat</h1>
        </div>
        <AccountNav />
      </div>

      {query.error && <p className="form-error admin-message">{query.error}</p>}

      <div className="account-grid">
        <form action={updateProfileAction} className="admin-form">
          <h2>Data pribadi</h2>
          <label className="field">
            <span>Email</span>
            <input value={user.email} disabled />
          </label>
          <label className="field">
            <span>Nama lengkap</span>
            <input name="fullName" defaultValue={user.fullName} required minLength={2} />
          </label>
          <label className="field">
            <span>Nomor telepon</span>
            <input name="phone" defaultValue={user.phone ?? ''} placeholder="+628123456789" />
          </label>
          <button className="button button-primary">Simpan profil</button>
        </form>

        <form action={saveAddressAction.bind(null, undefined)} className="admin-form">
          <h2>Tambah alamat</h2>
          <div className="form-row">
            <label className="field"><span>Label</span><input name="label" required placeholder="Rumah / Kantor" /></label>
            <label className="field"><span>Penerima</span><input name="recipient" required /></label>
          </div>
          <label className="field"><span>Telepon penerima</span><input name="phone" required placeholder="+628123456789" /></label>
          <label className="field"><span>Alamat lengkap</span><textarea name="addressLine" required rows={3} /></label>
          <div className="form-row">
            <input name="district" required placeholder="Kecamatan" />
            <input name="city" required placeholder="Kota/Kabupaten" />
          </div>
          <div className="form-row">
            <input name="province" required placeholder="Provinsi" />
            <input name="postalCode" required placeholder="Kode pos" />
          </div>
          <label className="check-field"><input type="checkbox" name="isDefault" /> Jadikan default</label>
          <button className="button button-primary">Tambah alamat</button>
        </form>
      </div>

      <section className="address-management">
        <h2>Alamat tersimpan</h2>
        {addresses.length === 0 && <p className="muted">Belum ada alamat tersimpan.</p>}
        {addresses.map((address) => (
          <form action={saveAddressAction.bind(null, address.id)} className="address-editor" key={address.id}>
            <div className="form-row">
              <input name="label" defaultValue={address.label} required />
              <input name="recipient" defaultValue={address.recipient} required />
            </div>
            <input name="phone" defaultValue={address.phone} required />
            <textarea name="addressLine" defaultValue={address.addressLine} required />
            <div className="form-row">
              <input name="district" defaultValue={address.district} required />
              <input name="city" defaultValue={address.city} required />
            </div>
            <div className="form-row">
              <input name="province" defaultValue={address.province} required />
              <input name="postalCode" defaultValue={address.postalCode} required />
            </div>
            <div className="address-actions">
              <span>{address.isDefault ? 'Alamat default' : address.label}</span>
              <button>Simpan</button>
              {!address.isDefault && (
                <button formAction={setDefaultAddressAction.bind(null, address.id)}>Jadikan default</button>
              )}
              <button className="danger-link" formAction={deleteAddressAction.bind(null, address.id)}>Hapus</button>
            </div>
          </form>
        ))}
      </section>
    </section>
  );
}
