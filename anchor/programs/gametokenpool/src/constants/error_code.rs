use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
  #[msg("User is not in the game")]
  UserNotFoundInGame,

  #[msg("User does not have enough token to transfer")]
  InsufficientAmount,

  #[msg("Insufficient amount in game account")]
  InsufficientAmountInGameAccount,

  #[msg("Game token account is not empty")]
  GameTokenAccountNotEmpty,

  #[msg("Game is full, please join another game")]
  GameIsFull,

  #[msg("User already joined game")]
  UserJoinedGame,
}
