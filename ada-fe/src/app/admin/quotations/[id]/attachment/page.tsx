import { downloadMediaAction } from '@/actions/media.actions';
import { getAdminQuotation } from '@/lib/admin-api';
export default async function AttachmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const quotation = await getAdminQuotation(id);
  return <section className="section"><h1>Lampiran {quotation.quotationNumber}</h1>{quotation.attachmentId ? <form action={downloadMediaAction.bind(null, quotation.attachmentId)}><button className="button button-primary">Unduh BOQ</button></form> : <p>Tidak ada lampiran.</p>}</section>;
}
