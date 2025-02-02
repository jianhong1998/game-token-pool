'use server';

import { ConnectionUtil } from '@/util/server/connection';
import { getAccount } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

export type IUserData = {
  user: {
    name: string;
    publicKey: string;
  };
  token: {
    totalDepositedAmount: number;
    currentAmount: number;
    accountPublicKey: string;
  };
};

export const getUserData = async (username: string): Promise<IUserData> => {
  const program = ConnectionUtil.getProgram();
  const wallet = ConnectionUtil.getWallet();

  const [userPublicKey] = PublicKey.findProgramAddressSync(
    [Buffer.from('user'), Buffer.from(username), wallet.publicKey.toBuffer()],
    program.programId
  );

  const user = await program.account.user.fetch(userPublicKey);

  const tokenAccount = await getAccount(
    program.provider.connection,
    user.tokenAccount
  );

  console.log(
    `[Get User Data] successfully fetch user data (${userPublicKey}) and the token account (${user.tokenAccount})`
  );

  return {
    user: {
      name: user.name,
      publicKey: userPublicKey.toBase58(),
    },
    token: {
      totalDepositedAmount: user.totalDepositedAmount.toNumber(),
      currentAmount: Number(tokenAccount.amount),
      accountPublicKey: tokenAccount.address.toBase58(),
    },
  };
};

export const getAllUserData = async (): Promise<IUserData[]> => {
  const LOG_KEY = '[Get All Users]';
  const program = ConnectionUtil.getProgram();
  const signer = ConnectionUtil.getSigner();

  const users = (await program.account.user.all()).filter((user) =>
    user.account.authority.equals(signer.publicKey)
  );

  console.log(`${LOG_KEY} Fetched all users.`);

  const result = [] as IUserData[];

  for (const user of users) {
    const tokenAccountPublicKey = user.account.tokenAccount;

    const tokenAccount = await getAccount(
      program.provider.connection,
      tokenAccountPublicKey
    );

    result.push({
      user: {
        name: user.account.name,
        publicKey: user.publicKey.toBase58(),
      },
      token: {
        accountPublicKey: tokenAccountPublicKey.toBase58(),
        currentAmount: Number(tokenAccount.amount),
        totalDepositedAmount: user.account.totalDepositedAmount.toNumber(),
      },
    });
  }

  console.log(`${LOG_KEY} Token accounts for each user are fetched.`);
  console.log(
    `${LOG_KEY} Total ${result.length} users are found for the pool.`
  );

  return result;
};
