use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
  burn, close_account, Burn, CloseAccount, Mint, TokenAccount, TokenInterface,
};

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
      b"mint",
      signer.key().as_ref(),
    ],
    bump = pool.mint_bump
  )]
  pub mint: InterfaceAccount<'info, Mint>,

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
  let signer = &context.accounts.signer;
  let account = &context.accounts.pool_token_account;
  let mint = &context.accounts.mint;
  let cpi_program = context.accounts.token_program.to_account_info();

  let burn_token_cpi_accounts = Burn {
    from: account.to_account_info(),
    authority: signer.to_account_info(),
    mint: mint.to_account_info(),
  };
  let burn_token_cpi_context = CpiContext::new(cpi_program.clone(), burn_token_cpi_accounts);

  burn(burn_token_cpi_context, account.amount)?;

  let close_account_cpi_accounts = CloseAccount {
    account: account.to_account_info(),
    authority: signer.to_account_info(),
    destination: signer.to_account_info(),
  };

  let close_account_cpi_context = CpiContext::new(cpi_program.clone(), close_account_cpi_accounts);

  close_account(close_account_cpi_context)?;

  Ok(())
}
