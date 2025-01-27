use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Pool {
  pub bump: u8,
  pub mint_bump: u8,
  pub pool_token_account_bump: u8,
}
