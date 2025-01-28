use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
  transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::{
  constants::ErrorCodes,
  states::{Pool, User},
};

#[derive(Accounts)]
#[instruction(from_user_name: String, to_user_name: String)]
pub struct TransferTokenBetweenUsers<'info> {
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
      signer.key().as_ref()
    ],
    bump = pool.mint_bump
  )]
  pub mint: InterfaceAccount<'info, Mint>,

  #[account(
    mut,
    seeds = [
      b"user",
      from_user_name.as_bytes().as_ref(),
      signer.key().as_ref()
    ],
    bump = from_user_account.bump
  )]
  pub from_user_account: Account<'info, User>,

  #[account(
    mut,
    seeds = [
      b"user",
      to_user_name.as_bytes().as_ref(),
      signer.key().as_ref()
    ],
    bump = to_user_account.bump
  )]
  pub to_user_account: Account<'info, User>,

  #[account(
    mut,
    seeds = [
      from_user_account.key().as_ref(),
    ],
    bump = from_user_account.token_account_bump
  )]
  pub from_user_token_account: InterfaceAccount<'info, TokenAccount>,

  #[account(
    mut,
    seeds = [
      to_user_account.key().as_ref(),
    ],
    bump = to_user_account.token_account_bump
  )]
  pub to_user_token_account: InterfaceAccount<'info, TokenAccount>,
}

pub fn process_transfer_token_between_users(
  context: Context<TransferTokenBetweenUsers>,
  from_user_name: String,
  to_user_name: String,
  amount: u64,
) -> Result<()> {
  let cpi_accounts = TransferChecked {
    from: context.accounts.from_user_token_account.to_account_info(),
    to: context.accounts.to_user_token_account.to_account_info(),
    mint: context.accounts.mint.to_account_info(),
    authority: context.accounts.signer.to_account_info(),
  };
  let cpi_program = context.accounts.token_program.to_account_info();
  let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
  let decimals = context.accounts.mint.decimals;

  let from_user_initial_token_amount: u64 = context.accounts.from_user_token_account.amount;
  let to_user_initial_token_amount: u64 = context.accounts.to_user_token_account.amount;

  msg!(
    "Sender current token amount: {}\nReceipient current token amount: {}",
    from_user_initial_token_amount,
    to_user_initial_token_amount
  );

  msg!(
    "Transfering token from {} to {}",
    context.accounts.from_user_token_account.key(),
    context.accounts.to_user_token_account.key()
  );
  transfer_checked(cpi_context, amount, decimals)?;
  msg!("Token transferred from {} to {} successfully ✅", from_user_name, to_user_name);

  msg!("Verifying amount after transfering...");

  let from_user_updated_token_amount = context.accounts.from_user_token_account.amount;
  let to_user_updated_token_amount = context.accounts.to_user_token_account.amount;

  let expected_from_user_token_amount = from_user_initial_token_amount.checked_sub(amount).unwrap();
  let expected_to_user_token_amount = to_user_initial_token_amount.checked_add(amount).unwrap();

  if from_user_updated_token_amount != expected_from_user_token_amount {
    msg!(
      "Sender post amount ({}) is not equal to expected amount ({}) ❌",
      from_user_updated_token_amount,
      expected_from_user_token_amount
    );
    return Err(ErrorCodes::TokenAmountUntidy.into());
  }

  if to_user_updated_token_amount != expected_to_user_token_amount {
    msg!(
      "Receipient post amount ({}) is not equal to expected amount ({}) ❌",
      to_user_updated_token_amount,
      expected_to_user_token_amount
    );
    return Err(ErrorCodes::TokenAmountUntidy.into());
  }

  msg!("Amount verified ✅");

  Ok(())
}
