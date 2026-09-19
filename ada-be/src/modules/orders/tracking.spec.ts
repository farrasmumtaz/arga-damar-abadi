import { parseTracking } from './tracking.module';
describe('Tracking response', () => {
  it('never exposes another shipment', () => {
    expect(() =>
      parseTracking(
        {
          success: true,
          waybill_id: 'other',
          status: 'delivered',
          history: [],
        },
        'mine',
      ),
    ).toThrow();
  });
  it('returns only safe timeline fields, excluding provider address/phone', () => {
    expect(
      parseTracking(
        {
          success: true,
          waybill_id: 'mine',
          status: 'delivered',
          destination: { phone: 'private' },
          history: [
            {
              status: 'delivered',
              note: 'Received',
              updated_at: '2026-09-19T00:00:00Z',
            },
            { status: 'bad', note: 'bad', updated_at: 'nonsense' },
          ],
        },
        'mine',
      ),
    ).toEqual({
      status: 'delivered',
      history: [
        {
          status: 'delivered',
          note: 'Received',
          updatedAt: '2026-09-19T00:00:00.000Z',
        },
      ],
    });
  });
});
