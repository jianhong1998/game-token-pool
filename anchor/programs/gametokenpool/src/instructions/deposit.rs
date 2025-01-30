use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface, TokenAccount, MintTo, mint_to};

use crate::states::{Pool, User};

#[derive(Accounts)]
#[instruction(user_name: String)]
pub struct Deposit<'info> {
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
    mut,
    seeds = [
      b"mint",
      signer.key().as_ref()
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
    bump = pool.pool_token_account_bump
  )]
  pub pool_token_account: InterfaceAccount<'info, TokenAccount>,

  #[account(
    mut,
    seeds = [
      b"user",
      user_name.as_bytes().as_ref(),
      signer.key().as_ref()
    ],
    bump = user.bump
  )]
  pub user: Account<'info, User>,

  #[account(
    mut,
    seeds = [
      user.key().as_ref()
    ],
    bump = user.token_account_bump
  )]
  pub user_token_account: InterfaceAccount<'info, TokenAccount>,
}

pub fn process_deposit(context: Context<Deposit>, _user_name: String, amount: u64) -> Result<()> {
  let signer_key = context.accounts.signer.key();
  let pool = &context.accounts.pool;
  let user = &mut context.accounts.user;

  let cpi_program  = context.accounts.token_program.to_account_info();

  let mint_to_signer_seeds: &[&[&[u8]]] = &[&[
    b"mint",
    signer_key.as_ref(),
    &[pool.mint_bump]
  ]];
  let mint_to_cpi_accounts = MintTo {
    authority: context.accounts.mint.to_account_info(),
    mint: context.accounts.mint.to_account_info(),
    to: context.accounts.user_token_account.to_account_info()
  };
  let mint_to_context = CpiContext::new_with_signer(cpi_program.clone(), mint_to_cpi_accounts, mint_to_signer_seeds);
  // let decimals = context.accounts.mint.decimals;

  msg!("Minting token...");
  mint_to(mint_to_context, amount)?;
  msg!("Token minted successfully ✅");

  msg!("Updating user account");
  user.total_deposited_amount += amount;
  msg!("User account updated ✅");

  Ok(())
}
