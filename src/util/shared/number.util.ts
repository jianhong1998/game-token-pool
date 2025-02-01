export class NumberUtil {
  private constructor() {}

  /**
   * Convert token amount to currency with 2 decimals.
   * @example `200` token to `2.00` currency
   * @param tokenAmount Integer token amount
   */
  public static getDisplayAmount(tokenAmount: number): {
    value: number;
    displayString: string;
  } {
    const cashAmount = tokenAmount / 100;

    return {
      value: cashAmount,
      displayString: cashAmount.toFixed(2),
    };
  }
}
