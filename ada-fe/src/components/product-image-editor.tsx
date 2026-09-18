'use client';

import { useId, useRef, useState } from 'react';
import { uploadMediaAction } from '@/actions/media.actions';

interface ImageEntry { id: string; url: string; name: string }
const maximumImages = 10;
const maximumBytes = 5 * 1024 * 1024;

export function ProductImageEditor({ initialUrls, disabled, onUploadingChange }: {
  initialUrls: string[]; disabled: boolean; onUploadingChange: (uploading: boolean) => void;
}) {
  const inputId = useId();
  const [images, setImages] = useState<ImageEntry[]>(() => initialUrls.map((url, index) => ({ id: `existing-${index}`, url, name: `Foto ${index + 1}` })));
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const busy = useRef(false);

  async function upload(files: File[]) {
    if (busy.current || disabled || !files.length) return;
    setError(''); setMessage('');
    if (images.length + files.length > maximumImages) { setError('Maksimal 10 foto. Kurangi pilihan atau hapus foto dari daftar.'); return; }
    if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > maximumBytes)) {
      setError('Pilih foto JPEG, PNG, atau WebP dengan ukuran maksimal 5 MB per foto.'); return;
    }
    busy.current = true; setUploading(true); onUploadingChange(true);
    let uploaded = 0;
    try {
      // One request per file keeps each Server Action below the upload body limit.
      for (const file of files) {
        setMessage(`Mengunggah ${uploaded + 1} dari ${files.length}: ${file.name}`);
        const data = new FormData(); data.set('file', file);
        const result = await uploadMediaAction('images', data);
        if (result.error || !result.url) { setError(result.error ?? 'Foto tidak berhasil diunggah.'); break; }
        const url = result.url;
        setImages(current => [...current, { id: crypto.randomUUID(), url, name: file.name }]);
        uploaded += 1;
      }
      setMessage(uploaded ? `${uploaded} foto berhasil diunggah. Klik Simpan produk untuk menerapkan perubahan.` : 'Belum ada foto baru yang disimpan.');
    } catch { setError('Upload terputus. Foto yang sudah berhasil tetap ada; ulangi file yang belum terunggah.'); }
    finally { busy.current = false; setUploading(false); onUploadingChange(false); }
  }

  const locked = uploading || disabled;
  return <fieldset className="product-image-editor" disabled={locked}>
    <legend>Foto produk</legend>
    <input type="hidden" name="imageUrls" value={images.map(image => image.url).join('\n')}/>
    <div className="product-upload-zone" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void upload(Array.from(event.dataTransfer.files)); }}>
      <label htmlFor={inputId}><strong>Upload foto produk asli</strong><span>Pilih dari perangkat atau tarik foto ke area ini.</span></label>
      <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={locked || images.length >= maximumImages}
        onChange={event => { const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ''; void upload(files); }}/>
      <small>JPEG, PNG, WebP · maksimal 5 MB/foto · {images.length}/{maximumImages} foto. Foto pertama menjadi foto utama.</small>
    </div>
    {message && <p role="status" aria-live="polite">{message}</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    {images.length > 0 && <ol className="product-image-previews">{images.map((image,index) => <li key={image.id}>
      <img src={image.url} alt={`Pratinjau ${image.name}`} loading="lazy"/>
      <span>{index === 0 ? 'Foto utama' : `Foto ${index + 1}`}</span>
      <div className="product-image-controls">
        {index > 0 && <button type="button" onClick={() => setImages(current => [image, ...current.filter(item => item.id !== image.id)])} aria-label={`Jadikan foto ${index + 1} sebagai foto utama`}>Jadikan utama</button>}
        <button type="button" onClick={() => setImages(current => current.filter(item => item.id !== image.id))} aria-label={`Hapus foto ${index + 1} dari produk`}>Hapus dari produk</button>
      </div>
    </li>)}</ol>}
    <small>Foto yang dilepas dari produk tidak langsung dihapus dari storage. Perubahan daftar foto diterapkan setelah produk disimpan.</small>
  </fieldset>;
}
