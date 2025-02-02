use anchor_lang::prelude::*;
use anchor_spl::token_interface::{close_account, CloseAccount, TokenAccount, TokenInterface};

use crate::states::Pool;

#[derive(Accounts)]
pub struct ClosePool<'info> {
  pub system_program: Program<'info, System>,
  pub token_program: Interface<'info, TokenInterface>,

  #[account(mut)]
  pub signer: Signer<'info>,

  #[account(
    mut,
    seeds = [
      b"pool",
      signer.key().as_ref()
    ],
    bump = pool.bump,
    close = signer
  )]
  pub pool: Account<'info, Pool>,

  #[account(
    mut,
    seeds = [
      b"pool_token_account",
      signer.key().as_ref()
    ],
    bump = pool.pool_token_account_bump,
  )]
  pub pool_token_account: InterfaceAccount<'info, TokenAccount>,
}

pub fn process_close_pool(context: Context<ClosePool>) -> Result<()> {
  let close_account_cpi_accounts = CloseAccount {
    account: context.accounts.pool_token_account.to_account_info(),
    authority: context.accounts.signer.to_account_info(),
    destination: context.accounts.signer.to_account_info(),
  };
  let cpi_program = context.accounts.token_program.to_account_info();

  let close_account_cpi_context = CpiContext::new(cpi_program, close_account_cpi_accounts);

  close_account(close_account_cpi_context)?;

  Ok(())
}
