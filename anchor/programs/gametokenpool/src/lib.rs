#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

#[program]
pub mod gametokenpool {
    use super::*;

  pub fn close(_ctx: Context<CloseGametokenpool>) -> Result<()> {
    Ok(())
  }

  pub fn decrement(ctx: Context<Update>) -> Result<()> {
    ctx.accounts.gametokenpool.count = ctx.accounts.gametokenpool.count.checked_sub(1).unwrap();
    Ok(())
  }

  pub fn increment(ctx: Context<Update>) -> Result<()> {
    ctx.accounts.gametokenpool.count = ctx.accounts.gametokenpool.count.checked_add(1).unwrap();
    Ok(())
  }

  pub fn initialize(_ctx: Context<InitializeGametokenpool>) -> Result<()> {
    Ok(())
  }

  pub fn set(ctx: Context<Update>, value: u8) -> Result<()> {
    ctx.accounts.gametokenpool.count = value.clone();
    Ok(())
  }
}

#[derive(Accounts)]
pub struct InitializeGametokenpool<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(
  init,
  space = 8 + Gametokenpool::INIT_SPACE,
  payer = payer
  )]
  pub gametokenpool: Account<'info, Gametokenpool>,
  pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct CloseGametokenpool<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(
  mut,
  close = payer, // close account and return lamports to payer
  )]
  pub gametokenpool: Account<'info, Gametokenpool>,
}

#[derive(Accounts)]
pub struct Update<'info> {
  #[account(mut)]
  pub gametokenpool: Account<'info, Gametokenpool>,
}

#[account]
#[derive(InitSpace)]
pub struct Gametokenpool {
  count: u8,
}
