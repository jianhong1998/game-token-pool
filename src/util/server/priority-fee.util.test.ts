import { Connection } from '@solana/web3.js';
import { PriorityFeeUtil } from './priority-fee.util';

describe('PriorityFeeUtil.getPriorityFee', () => {
  const makeConnectionWithEmptyFees = () =>
    ({
      getRecentPrioritizationFees: jest.fn().mockResolvedValue([]),
    }) as unknown as Connection;

  it('falls back to 0 for "max" when there is no fee history (empty RPC result)', async () => {
    const connection = makeConnectionWithEmptyFees();

    const fee = await PriorityFeeUtil.getPriorityFee(connection, 'max');

    expect(fee).toBe(0);
  });

  it('falls back to 0 for "min" when there is no fee history (empty RPC result)', async () => {
    const connection = makeConnectionWithEmptyFees();

    const fee = await PriorityFeeUtil.getPriorityFee(connection, 'min');

    expect(fee).toBe(0);
  });

  it('falls back to 0 for "avg" when there is no fee history (empty RPC result)', async () => {
    const connection = makeConnectionWithEmptyFees();

    const fee = await PriorityFeeUtil.getPriorityFee(connection, 'avg');

    expect(fee).toBe(0);
  });
});
