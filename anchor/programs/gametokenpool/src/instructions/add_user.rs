use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
  mint_to, transfer_checked, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked,
};

use crate::states::{Pool, User};

#[derive(Accounts)]
#[instruction(user_name: String)]
pub struct AddUserToPool<'info> {
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

  #[account(
    mut,
    seeds = [
      b"mint",
      signer.key().as_ref(),
    ],
    bump = pool.mint_bump,
  )]
  pub mint: InterfaceAccount<'info, Mint>,

  #[account(
    init,
    payer = signer,
    space = User::INIT_SPACE,
    seeds = [
      b"user",
      user_name.as_bytes().as_ref(),
      signer.key().as_ref()
    ],
    bump
  )]
  pub user: Account<'info, User>,

  #[account(
    init,
    payer = signer,
    seeds = [
      user.key().as_ref(),
    ],
    bump,
    token::mint = mint,
    token::authority = signer,
  )]
  pub user_token_account: InterfaceAccount<'info, TokenAccount>,
}

pub fn process_add_user_to_pool(
  context: Context<AddUserToPool>,
  user_name: String,
  amount: u64,
) -> Result<()> {
  let signer_key = context.accounts.signer.key();
  let user = &mut context.accounts.user;
  let pool = &context.accounts.pool;
  let cpi_program = context.accounts.token_program.to_account_info();

  // Create user accounts
  user.authority = signer_key.clone();
  user.bump = context.bumps.user;
  user.token_account_bump = context.bumps.user_token_account;
  user.name = user_name;
  user.token_account = context.accounts.user_token_account.key();

  if amount == 0 {
    return Ok(());
  }

  // Mint token
  msg!("Minting token...");
  let mint_to_cpi_accounts = MintTo {
    authority: context.accounts.mint.to_account_info(),
    mint: context.accounts.mint.to_account_info(),
    to: context.accounts.pool_token_account.to_account_info(),
  };
  let mint_to_signer_seeds: &[&[&[u8]]] = &[&[b"mint", signer_key.as_ref(), &[pool.mint_bump]]];
  let mint_to_cpi_context =
    CpiContext::new_with_signer(cpi_program.clone(), mint_to_cpi_accounts, mint_to_signer_seeds);
  mint_to(mint_to_cpi_context, amount)?;
  msg!("Token minted successfully ✅");

  // Transfer token from Pool token account to User token account
  let decimals = context.accounts.mint.decimals;

  let transfer_token_cpi_accounts = TransferChecked {
    from: context.accounts.pool_token_account.to_account_info(),
    to: context.accounts.user_token_account.to_account_info(),
    authority: context.accounts.signer.to_account_info(),
    mint: context.accounts.mint.to_account_info(),
  };
  let transfer_token_cpi_context = CpiContext::new(cpi_program, transfer_token_cpi_accounts);

  msg!("Transfering token to user token account...");
  transfer_checked(transfer_token_cpi_context, amount, decimals)?;
  msg!("Token transfered to user token account ({}) ✅", context.accounts.user_token_account.key());

  user.total_deposited_amount = amount;

  Ok(())
}
