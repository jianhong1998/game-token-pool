use anchor_lang::prelude::*;
use anchor_spl::token_interface::{close_account, CloseAccount, TokenAccount, TokenInterface};

use crate::{
  constants::ErrorCode,
  states::{Game, Pool},
};

#[derive(Accounts)]
#[instruction(game_name: String)]
pub struct DeleteGame<'info> {
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
    mut,
    seeds = [
      b"game",
      signer.key().as_ref(),
      pool.key().as_ref(),
      game_name.as_bytes().as_ref()
    ],
    bump = game.bump,
    close = signer
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
  // #[account(
  //   mut,
  //   seeds = [
  //     b"game-mint",
  //     signer.key().as_ref(),
  //     game.key().as_ref()
  //   ],
  //   bump = game.game_mint_bump
  // )]
  // pub game_mint: InterfaceAccount<'info, Mint>,
}

pub fn process_delete_game(context: Context<DeleteGame>) -> Result<()> {
  let game_token_account = &context.accounts.game_token_account;

  if game_token_account.amount > 0 {
    return Err(ErrorCode::GameTokenAccountNotEmpty.into());
  }

  let cpi_accounts = CloseAccount {
    account: context.accounts.game_token_account.to_account_info(),
    authority: context.accounts.signer.to_account_info(),
    destination: context.accounts.signer.to_account_info(),
  };
  let cpi_program = context.accounts.token_program.to_account_info();
  let cpi_context = CpiContext::new(cpi_program, cpi_accounts);

  msg!("Closing game token account ({})", context.accounts.game_token_account.key());
  close_account(cpi_context)?;
  msg!("Game token account is closed");

  Ok(())
}
