#![allow(clippy::result_large_err)]

pub mod constants;
pub mod instructions;
pub mod states;

use anchor_lang::prelude::*;
use instructions::*;

declare_id!("F6yyNFRtZbmT6pVqjF4FoKRYi6PwegpoEJ9PS5pY4RcS");

#[program]
pub mod gametokenpool {

  use super::*;

  pub fn init_pool(context: Context<InitPool>, pool_name: String) -> Result<()> {
    process_init_pool(context, pool_name)
  }

  pub fn init_pool_token_account(context: Context<InitPoolTokenAccount>) -> Result<()> {
    process_init_pool_token_account(context)
  }

  pub fn add_user_to_pool(
    context: Context<AddUserToPool>,
    user_name: String,
    amount: u64,
  ) -> Result<()> {
    process_add_user_to_pool(context, user_name, amount)
  }

  pub fn transfer_token_between_users(
    context: Context<TransferTokenBetweenUsers>,
    from_user_name: String,
    to_user_name: String,
    amount: u64,
  ) -> Result<()> {
    process_transfer_token_between_users(context, from_user_name, to_user_name, amount)
  }

  pub fn deposit(context: Context<Deposit>, user_name: String, amount: u64) -> Result<()> {
    process_deposit(context, user_name, amount)
  }

  pub fn user_end_game(context: Context<UserEndGame>, user_name: String) -> Result<()> {
    process_user_end_game(context, user_name)
  }

  pub fn close_pool(context: Context<ClosePool>) -> Result<()> {
    process_close_pool(context)
  }
}
