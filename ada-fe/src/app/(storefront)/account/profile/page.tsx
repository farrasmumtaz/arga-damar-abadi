import { MutationButton } from '@/components/mutation-button';
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
          <p className="eyebrow"><span /> Akun saya</p>
          <h1>Profil & alamat</h1>
        </div>
        <AccountNav />
      </div>

      {query.error && <p role="alert" className="form-error admin-message">{query.error}</p>}

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
          <label className="check-field"><input name="whatsappOptIn" type="checkbox" defaultChecked={Boolean(user.whatsappOptInAt)}/><span>Saya setuju menerima update transaksi dan penawaran proyek lewat WhatsApp di nomor ini. Dapat dinonaktifkan kapan saja.</span></label>
          <button className="button button-primary">Simpan profil</button>
        </form>

      </div>

      <section className="address-management">
        <h2>Alamat tersimpan</h2>
        {addresses.length === 0 && <p className="muted">Belum ada alamat tersimpan.</p>}
        <details className="address-disclosure"><summary>Tambah alamat</summary><form action={saveAddressAction.bind(null, undefined)} className="admin-form">
          <h3>Alamat baru</h3>
          <div className="form-row">
            <label className="field"><span>Label</span><input name="label" required placeholder="Rumah / Kantor" /></label>
            <label className="field"><span>Penerima</span><input name="recipient" required placeholder="Nama penerima" /></label>
          </div>
          <label className="field"><span>Telepon penerima</span><input name="phone" required placeholder="+628123456789" /></label>
          <label className="field"><span>Alamat lengkap</span><textarea name="addressLine" required rows={3} /></label>
          <div className="form-row">
            <label className="field"><span>Kecamatan</span><input name="district" required placeholder="Kecamatan" /></label>
            <label className="field"><span>Kota/Kabupaten</span><input name="city" required placeholder="Kota/Kabupaten" /></label>
          </div>
          <div className="form-row">
            <label className="field"><span>Provinsi</span><input name="province" required placeholder="Provinsi" /></label>
            <label className="field"><span>Kode pos</span><input name="postalCode" required placeholder="Kode pos" /></label>
          </div>
          <label className="check-field"><input type="checkbox" name="isDefault" /> Jadikan default</label>
          <button className="button button-primary">Tambah alamat</button>
        </form></details>
        {addresses.map((address) => (
          <div className="address-editor" key={address.id}><strong>{address.label}{address.isDefault ? ' · Default' : ''}</strong><p>{address.recipient} · {address.phone}<br />{address.addressLine}, {address.district}, {address.city}, {address.province} {address.postalCode}</p><details className="address-disclosure"><summary>Edit alamat</summary><form action={saveAddressAction.bind(null, address.id)} className="address-edit-form">
            <div className="form-row">
              <label className="field"><span>Label alamat</span><input name="label" defaultValue={address.label} required /></label>
              <label className="field"><span>Nama penerima</span><input name="recipient" defaultValue={address.recipient} required /></label>
            </div>
            <label className="field"><span>Telepon penerima</span><input name="phone" defaultValue={address.phone} required /></label>
            <label className="field"><span>Alamat lengkap</span><textarea name="addressLine" defaultValue={address.addressLine} required /></label>
            <div className="form-row">
              <label className="field"><span>Kecamatan</span><input name="district" defaultValue={address.district} required /></label>
              <label className="field"><span>Kota/Kabupaten</span><input name="city" defaultValue={address.city} required /></label>
            </div>
            <div className="form-row">
              <label className="field"><span>Provinsi</span><input name="province" defaultValue={address.province} required /></label>
              <label className="field"><span>Kode pos</span><input name="postalCode" defaultValue={address.postalCode} required /></label>
            </div>
            <div className="address-actions">
              <span>{address.isDefault ? 'Alamat default' : address.label}</span>
              <button>Simpan</button>
              {!address.isDefault && (
                <button formAction={setDefaultAddressAction.bind(null, address.id)}>Jadikan default</button>
              )}
              <MutationButton formNoValidate className="danger-link" formAction={deleteAddressAction.bind(null, address.id)} confirmation={`Hapus alamat ${address.label}?`}>Hapus</MutationButton>
            </div>
          </form></details></div>
        ))}
      </section>
    </section>
  );
}
