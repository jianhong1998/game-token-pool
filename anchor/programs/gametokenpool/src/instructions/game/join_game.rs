use anchor_lang::prelude::*;

use crate::{
  constants::ErrorCode,
  states::{Game, Pool, User},
};

#[derive(Accounts)]
#[instruction(game_name: String, user_name: String)]
pub struct JoinGame<'info> {
  pub system_program: Program<'info, System>,

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
      b"game",
      signer.key().as_ref(),
      pool.key().as_ref(),
      game_name.as_bytes().as_ref()
    ],
    bump = game.bump
  )]
  pub game: Account<'info, Game>,
}

pub fn process_user_join_game(context: Context<JoinGame>) -> Result<()> {
  let game = &mut context.accounts.game;
  let new_user_public_key = context.accounts.user.key();

  if game.players.len() == 20 {
    return Err(ErrorCode::GameIsFull.into());
  }

  match game.players.iter().find(|player_key| (*player_key).eq(&new_user_public_key)) {
    Some(_player) => return Err(ErrorCode::UserJoinedGame.into()),
    None => {}
  }

  game.players.push(new_user_public_key);

  Ok(())
}
