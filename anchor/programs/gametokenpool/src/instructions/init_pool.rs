use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::{constants::SPACE_DISCRIMENTAL, states::Pool};

#[derive(Accounts)]
pub struct InitPool<'info> {
  pub system_program: Program<'info, System>,

  #[account(mut)]
  pub signer: Signer<'info>,

  #[account(
    init,
    payer = signer,
    space = SPACE_DISCRIMENTAL + Pool::INIT_SPACE,
    seeds = [
      b"pool",
      signer.key().as_ref()
    ],
    bump
  )]
  pub pool: Account<'info, Pool>,
}

#[derive(Accounts)]
pub struct InitPoolTokenAccount<'info> {
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
    bump = pool.bump
  )]
  pub pool: Account<'info, Pool>,

  #[account(
    init,
    payer = signer,
    seeds = [
      b"mint",
      signer.key().as_ref(),
    ],
    mint::decimals = 0,
    mint::authority = mint,
    mint::freeze_authority = mint,
    bump,
  )]
  pub mint: InterfaceAccount<'info, Mint>,

  #[account(
    init,
    payer = signer,
    seeds = [
      b"pool_token_account",
      signer.key().as_ref(),
    ],
    bump,
    token::mint = mint,
    token::authority = signer,
  )]
  pub pool_token_account: InterfaceAccount<'info, TokenAccount>,
}

pub fn process_init_pool(context: Context<InitPool>, pool_name: String) -> Result<()> {
  let pool = &mut context.accounts.pool;

  pool.bump = context.bumps.pool;
  pool.pool_name = pool_name;

  Ok(())
}

pub fn process_init_pool_token_account(context: Context<InitPoolTokenAccount>) -> Result<()> {
  let pool = &mut context.accounts.pool;

  pool.mint_bump = context.bumps.mint;
  pool.pool_token_account_bump = context.bumps.pool_token_account;

  Ok(())
}
