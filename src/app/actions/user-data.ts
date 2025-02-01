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
