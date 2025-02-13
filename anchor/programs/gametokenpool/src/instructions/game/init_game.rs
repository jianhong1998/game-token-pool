use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::states::{Game, Pool};

#[derive(Accounts)]
#[instruction(game_name: String)]
pub struct InitGame<'info> {
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
    init,
    payer = signer,
    space = Game::INIT_SPACE,
    seeds = [
      b"game",
      signer.key().as_ref(),
      pool.key().as_ref(),
      game_name.as_bytes().as_ref(),
    ],
    bump
  )]
  pub game: Account<'info, Game>,
}

#[derive(Accounts)]
#[instruction(game_name: String)]
pub struct InitGameTokenAccount<'info> {
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
    mut,
    seeds = [
      b"game",
      signer.key().as_ref(),
      pool.key().as_ref(),
      game_name.as_bytes().as_ref(),
    ],
    bump = game.bump
  )]
  pub game: Account<'info, Game>,

  #[account(
    init,
    payer = signer,
    seeds = [
      b"game-token-account",
      signer.key().as_ref(),
      game.key().as_ref()
    ],
    token::mint = pool_mint,
    token::authority = signer,
    bump
  )]
  pub game_token_account: InterfaceAccount<'info, TokenAccount>,
}

pub fn process_init_game(context: Context<InitGame>, game_name: String) -> Result<()> {
  let game = &mut context.accounts.game;

  game.pool = context.accounts.pool.key();
  game.game_name = game_name;
  game.bump = context.bumps.game;
  game.players = vec![];

  Ok(())
}

pub fn process_init_game_token_account(context: Context<InitGameTokenAccount>) -> Result<()> {
  let game = &mut context.accounts.game;

  game.game_token_account = context.accounts.game_token_account.key();
  game.game_token_account_bump = context.bumps.game_token_account;

  Ok(())
}
