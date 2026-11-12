export function paymentResult(status?: string): { title: string; message: string } {
  if (status && ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(status)) {
    return { title: 'Pembayaran terkonfirmasi', message: 'Pembayaran pesanan ini telah dikonfirmasi oleh sistem toko.' };
  }
  if (status === 'REFUNDED') return { title: 'Pembayaran dikembalikan', message: 'Pesanan ini telah direfund.' };
  if (status === 'CANCELLED') return { title: 'Pesanan dibatalkan', message: 'Periksa detail pesanan atau hubungi toko jika Anda sudah melakukan pembayaran.' };
  return { title: 'Periksa status pembayaran', message: 'Pembayaran belum terkonfirmasi. Periksa status pesanan sebelum mencoba membayar kembali.' };
}
