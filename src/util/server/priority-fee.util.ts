import { Connection } from '@solana/web3.js';

export class PriorityFeeUtil {
  private constructor() {}

  public static async getPriorityFee(
    connection: Connection,
    priorityLevel: 'min' | 'max' | 'avg'
  ): Promise<number> {
    const recentPriorityFees = (
      await connection.getRecentPrioritizationFees()
    ).map((feeContext) => feeContext.prioritizationFee);

    let lamports: number = 0;

    switch (priorityLevel) {
      case 'min':
        lamports = Math.min(...recentPriorityFees);
        break;
      case 'max':
        lamports = Math.max(...recentPriorityFees);
        break;
      case 'avg':
        lamports = this.calculateAverage(recentPriorityFees);
        break;
      default:
        break;
    }

    return lamports;
  }

  private static calculateAverage(fees: number[]): number {
    let total = 0;

    fees.forEach((num) => (total += num));

    return total / fees.length;
  }
}
