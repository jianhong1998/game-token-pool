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
pub struct UserQuitGame<'info> {
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
      b"mint",
      signer.key().as_ref(),
    ],
    bump = pool.mint_bump
  )]
  pub pool_mint: InterfaceAccount<'info, Mint>,

  #[account(
    mut,
    seeds = [
      b"game",
      signer.key().as_ref(),
      pool.key().as_ref(),
      game_name.as_bytes().as_ref()
    ],
    bump = game.bump
  )]
  pub game: Account<'info, Game>,

  // #[account(
  //   mut,
  //   seeds = [
  //     b"game-mint",
  //     signer.key().as_ref(),
  //     game.key().as_ref()
  //   ],
  //   bump
  // )]
  // pub game_mint: InterfaceAccount<'info, Mint>,
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
      user.key().as_ref(),
    ],
    bump
  )]
  pub user_token_account: InterfaceAccount<'info, TokenAccount>,
}

pub fn process_user_quit_game(context: Context<UserQuitGame>) -> Result<()> {
  let game = &mut context.accounts.game;
  let game_token_account = &context.accounts.game_token_account;

  /*
    TODO: check if player is the last player in the game.
    If player is the last player and the game token account is not empty, then the player will receive all the token in game token account.
  */
  let game_account_balance = context.accounts.game_token_account.amount;

  if game_account_balance != 0 {
    msg!("Game is having token while last player quiting game. Transfering all balance to the last player...");

    let cpi_program = context.accounts.token_program.to_account_info();
    let cpi_accounts = TransferChecked {
      from: game_token_account.to_account_info(),
      to: context.accounts.user_token_account.to_account_info(),
      authority: context.accounts.signer.to_account_info(),
      mint: context.accounts.pool_mint.to_account_info(),
    };
    let decimals = context.accounts.pool_mint.decimals;

    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);

    transfer_checked(cpi_context, game_account_balance, decimals)?;

    msg!(
      "Transfered {} to last player ({}) ✅",
      game_account_balance,
      context.accounts.user_token_account.key()
    );
  }

  msg!("Removing user from game...");

  let player_index_search_result = &game
    .players
    .iter()
    .position(|user_public_key| *user_public_key == context.accounts.user.key());

  let player_index: usize;

  match player_index_search_result {
    Some(index) => player_index = *index,
    None => return Err(ErrorCode::UserNotFoundInGame.into()),
  }

  game.players.swap_remove(player_index);

  msg!("User is removed from the game. Remaining {} player(s) in the game", game.players.len());

  Ok(())
}
