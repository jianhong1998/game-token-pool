use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct User {
  pub authority: Pubkey,
  #[max_len(50)]
  pub name: String,
  pub total_deposited_amount: u64,
  pub bump: u8,
  pub token_account: Pubkey,
  pub token_account_bump: u8,
}
