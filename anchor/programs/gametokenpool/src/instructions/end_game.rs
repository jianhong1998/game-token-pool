use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
  close_account, transfer_checked, CloseAccount, Mint, TokenAccount, TokenInterface,
  TransferChecked,
};

use crate::states::{Pool, User};

#[derive(Accounts)]
#[instruction(user_name: String)]
pub struct UserEndGame<'info> {
  pub system_program: Program<'info, System>,
  pub token_program: Interface<'info, TokenInterface>,

  #[account(mut)]
  pub signer: Signer<'info>,

  #[account(
    mut,
    seeds = [
      b"user",
      user_name.as_bytes().as_ref(),
      signer.key().as_ref()
    ],
    bump = user.bump,
    close = signer
  )]
  pub user: Account<'info, User>,

  #[account(
    mut,
    seeds = [
      user.key().as_ref()
    ],
    bump = user.token_account_bump,
  )]
  pub user_token_account: InterfaceAccount<'info, TokenAccount>,

  #[account(
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
      b"pool_token_account",
      signer.key().as_ref()
    ],
    bump = pool.pool_token_account_bump
  )]
  pub pool_token_account: InterfaceAccount<'info, TokenAccount>,

  #[account(
    seeds = [
      b"mint",
      signer.key().as_ref()
    ],
    bump = pool.mint_bump
  )]
  pub mint: InterfaceAccount<'info, Mint>,
}

pub fn process_user_end_game(context: Context<UserEndGame>, _user_name: String) -> Result<()> {
  let user_token_account = &context.accounts.user_token_account;
  let signer = &context.accounts.signer;
  let cpi_program = &context.accounts.token_program;

  if user_token_account.amount > 0 {
    let cpi_accounts = TransferChecked {
      from: user_token_account.to_account_info(),
      to: context.accounts.pool_token_account.to_account_info(),
      mint: context.accounts.mint.to_account_info(),
      authority: signer.to_account_info(),
    };
    let cpi_context = CpiContext::new(cpi_program.to_account_info(), cpi_accounts);
    let decimals = context.accounts.mint.decimals;

    msg!("User has token on hand, transfering back to pool...");
    transfer_checked(cpi_context, user_token_account.amount, decimals)?;
    msg!("All user's token is transfered to pool ✅");
  }

  let close_account_cpi_accounts = CloseAccount {
    account: user_token_account.to_account_info(),
    authority: signer.to_account_info(),
    destination: signer.to_account_info(),
  };
  let close_account_cpi_context =
    CpiContext::new(cpi_program.to_account_info(), close_account_cpi_accounts);

  msg!("Closing user token account...");
  close_account(close_account_cpi_context)?;
  msg!("User token account is closed successfully ✅");

  Ok(())
}
