#![allow(clippy::result_large_err)]

pub mod constants;
pub mod instructions;
pub mod states;

use anchor_lang::prelude::*;
use instructions::*;

declare_id!("3eVNw2R4rSaPew9D5SDJRL1roF4fV4EgJe1W5EMvAGNm");

#[program]
pub mod gametokenpool {

  use super::*;

  pub fn init_pool(context: Context<InitPool>) -> Result<()> {
    process_init_pool(context)
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
}
