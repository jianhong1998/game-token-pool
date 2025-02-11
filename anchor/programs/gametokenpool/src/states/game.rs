use anchor_lang::prelude::*;

use crate::constants::MAX_PLAYER_PER_GAME;

#[account]
#[derive(InitSpace)]
pub struct Game {
  #[max_len(50)]
  pub game_name: String,

  #[max_len(MAX_PLAYER_PER_GAME)]
  pub players: Vec<Pubkey>,

  pub game_token_account: Pubkey,

  pub pool: Pubkey,

  // Bumps
  pub bump: u8,
  pub game_token_account_bump: u8,
  pub game_mint_bump: u8,
}
