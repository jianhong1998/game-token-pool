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
pub struct TransferTokenToPlayer<'info> {
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
      b"game",
      signer.key().as_ref(),
      pool.key().as_ref(),
      game_name.as_bytes().as_ref()
    ],
    bump = game.bump
  )]
  pub game: Account<'info, Game>,

  #[account(
    mut,
    seeds = [
      b"game-token-account",
      signer.key().as_ref(),
      game.key().as_ref()
    ],
    bump = game.game_token_account_bump
  )]
  pub game_token_account: InterfaceAccount<'info, TokenAccount>,

  #[account(
    mut,
    seeds = [
      b"game-mint",
      signer.key().as_ref(),
      game.key().as_ref()
    ],
    bump = game.game_mint_bump
  )]
  game_mint: InterfaceAccount<'info, Mint>,

  #[account(
    seeds = [
      b"user",
      user_name.as_bytes().as_ref(),
      signer.key().as_ref()
    ],
    bump
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

pub fn process_take_token_from_game(
  context: Context<TransferTokenToPlayer>,
  amount: u64,
) -> Result<()> {
  let game_token_account = &context.accounts.game_token_account;

  if game_token_account.amount < amount {
    return Err(ErrorCode::InsufficientAmountInGameAccount.into());
  }

  msg!(
    "Transfering {} token(s) from game token account ({}) to user token account ({})",
    amount,
    game_token_account.key(),
    context.accounts.user_token_account.key()
  );

  let decimals = context.accounts.game_mint.decimals;
  let cpi_accounts = TransferChecked {
    from: game_token_account.to_account_info(),
    to: context.accounts.user_token_account.to_account_info(),
    mint: context.accounts.game_mint.to_account_info(),
    authority: context.accounts.signer.to_account_info(),
  };
  let cpi_program = context.accounts.token_program.to_account_info();
  let cpi_context = CpiContext::new(cpi_program, cpi_accounts);

  transfer_checked(cpi_context, amount, decimals)?;

  msg!("Completed tranfer ✅");

  Ok(())
}
