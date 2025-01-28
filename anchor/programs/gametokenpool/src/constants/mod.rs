use anchor_lang::error_code;

pub const SPACE_DISCRIMENTAL: usize = 8;

#[error_code]
pub enum ErrorCodes {
  #[msg("Account token amount is untidy")]
  TokenAmountUntidy,
}
