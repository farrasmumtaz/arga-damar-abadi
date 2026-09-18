'use client';
import { useRef, useState, useTransition } from 'react';
import { uploadMediaAction } from '@/actions/media.actions';
export function MediaUpload({ purpose, onUploaded }: { purpose: 'images' | 'boq'; onUploaded?: (url: string) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [assetId, setAssetId] = useState('');
  return <div className="field">
    <label>Upload {purpose === 'images' ? 'gambar (JPEG/PNG/WebP)' : 'BOQ (PDF)'} — maksimum 5 MB<input ref={file} type="file" accept={purpose === 'images' ? 'image/jpeg,image/png,image/webp' : 'application/pdf'} disabled={pending} /></label>
    <button type="button" className="button button-secondary" disabled={pending} onClick={() => start(async () => {
      const selected = file.current?.files?.[0]; if (!selected) { setError('Pilih file terlebih dahulu.'); return; }
      setError(''); const form = new FormData(); form.set('file', selected);
      const result = await uploadMediaAction(purpose, form);
      if (result.error) setError(result.error); else { setAssetId(result.id ?? ''); if (result.url) onUploaded?.(result.url); }
    })}>{pending ? 'Mengunggah...' : 'Upload file'}</button>
    {purpose === 'boq' && <input type="hidden" name="attachmentId" value={assetId} />}
    {error && <p role="alert" className="form-error">{error}</p>}
    {assetId && <p role="status">File berhasil diunggah.</p>}
  </div>;
}
