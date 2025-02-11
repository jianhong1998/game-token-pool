use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
  transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::{
  constants::ErrorCode,
  states::{Game, Pool, User},
};

#[derive(Accounts)]
#[instruction(game_name: String, user_name: String)]
pub struct TransferTokenToGame<'info> {
  pub system_program: Program<'info, System>,
  pub token_program: Interface<'info, TokenInterface>,

  #[account(mut)]
  pub signer: Signer<'info>,

  #[account(
    seeds = [
      b"pool",
      signer.key().as_ref()
    ],
    bump = pool.bump
  )]
  pub pool: Account<'info, Pool>,

  #[account(
    seeds = [
      b"mint",
      signer.key().as_ref(),
    ],
    bump = pool.mint_bump
  )]
  pub pool_mint: InterfaceAccount<'info, Mint>,

  #[account(
    seeds = [
      b"user",
      user_name.as_bytes().as_ref(),
      signer.key().as_ref()
    ],
    bump = user.bump
  )]
  pub user: Account<'info, User>,

  #[account(
    seeds = [
      user.key().as_ref()
    ],
    bump = user.token_account_bump
  )]
  pub user_token_account: InterfaceAccount<'info, TokenAccount>,

  #[account(
    seeds = [
      b"game",
      signer.key().as_ref(),
      pool.key().as_ref(),
      game_name.as_bytes().as_ref()
    ],
    bump = game.bump
  )]
  pub game: Account<'info, Game>,

  #[account(
    seeds = [
      b"game-token-account",
      signer.key().as_ref(),
      game.key().as_ref()
    ],
    bump = game.game_token_account_bump
  )]
  pub game_token_account: InterfaceAccount<'info, TokenAccount>,
}

pub fn process_transfer_token_to_game(
  context: Context<TransferTokenToGame>,
  amount: u64,
) -> Result<()> {
  let user_token_account = &context.accounts.user_token_account;

  if user_token_account.amount < amount {
    return Err(ErrorCode::InsufficientAmount.into());
  }

  msg!(
    "Transfering {} token(s) from user token account ({}) to game token account ({})",
    amount,
    user_token_account.key(),
    context.accounts.game_token_account.key()
  );

  let decimals = context.accounts.pool_mint.decimals;
  let cpi_program = context.accounts.token_program.to_account_info();
  let cpi_account = TransferChecked {
    from: user_token_account.to_account_info(),
    to: context.accounts.game_token_account.to_account_info(),
    authority: context.accounts.signer.to_account_info(),
    mint: context.accounts.pool_mint.to_account_info(),
  };
  let cpi_context = CpiContext::new(cpi_program, cpi_account);

  transfer_checked(cpi_context, amount, decimals)?;

  msg!("Transfer completed ✅");

  Ok(())
}
