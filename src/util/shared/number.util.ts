export class NumberUtil {
  private constructor() {}

  /**
   * Convert token amount to currency with 2 decimals.
   * @param tokenAmount Integer token amount
   * @return currency with 2 decimals. Example: return `2.00` currency for `200` token
   */
  public static getCashAmount(
    tokenAmount: number,
    options?: { withComma?: boolean }
  ): {
    value: number;
    displayString: string;
  } {
    const cashAmount = tokenAmount / 100;

    let displayAmount: string;

    if (options?.withComma ?? false) {
      displayAmount = cashAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } else {
      displayAmount = cashAmount.toFixed(2);
    }

    return {
      value: cashAmount,
      displayString: displayAmount,
    };
  }
}
