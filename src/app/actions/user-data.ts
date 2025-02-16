'use server';

import { AccountUtil } from '@/util/server/account.util';
import { ConnectionUtil } from '@/util/server/connection';
import { LinkGeneratorUtil } from '@/util/shared/link-generator.util';
import { getAccount } from '@solana/spl-token';
import { getPools } from '../admin/actions/pool';
import { ErrorCode } from '@/constants/error';
import { ICommonResponse } from '@/types/common-response.type';

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
  link: {
    userAccount: string;
    userTokenAccount: string;
  };
  pool: {
    name: string;
    publicKey: string;
  };
};

export const getUserData = async (
  username: string
): Promise<ICommonResponse<IUserData>> => {
  const program = ConnectionUtil.getProgram();

  const userPublicKey = AccountUtil.getUserPublicKey(username);

  try {
    const user = await program.account.user.fetch(userPublicKey);

    const tokenAccount = await getAccount(
      program.provider.connection,
      user.tokenAccount
    );

    const pool = (await getPools())[0];

    console.log(
      `[Get User Data] successfully fetch user data (${userPublicKey}) and the token account (${user.tokenAccount})`
    );

    const data = {
      user: {
        name: user.name,
        publicKey: userPublicKey.toBase58(),
      },
      token: {
        totalDepositedAmount: user.totalDepositedAmount.toNumber(),
        currentAmount: Number(tokenAccount.amount),
        accountPublicKey: tokenAccount.address.toBase58(),
      },
      link: {
        userAccount: LinkGeneratorUtil.generateAccountLink(
          userPublicKey.toBase58()
        ),
        userTokenAccount: LinkGeneratorUtil.generateAccountLink(
          tokenAccount.address.toBase58()
        ),
      },
      pool: {
        name: pool?.name,
        publicKey: pool?.publicKey,
      },
    };

    return {
      isSuccess: true,
      data,
    };
  } catch (error) {
    const { message, cause, name, stack } = error as Error;
    let errorMessage = message;

    if (message.toLocaleLowerCase().includes(ErrorCode.USER_NOT_EXIST)) {
      errorMessage = ErrorCode.USER_NOT_EXIST;
    }

    return {
      isSuccess: false,
      error: {
        name,
        message: errorMessage,
        cause,
        stack,
      },
    };
  }
};

export const getAllUserData = async (): Promise<IUserData[]> => {
  const LOG_KEY = '[Get All Users]';
  const program = ConnectionUtil.getProgram();
  const signer = ConnectionUtil.getSigner();

  const users = (await program.account.user.all()).filter((user) =>
    user.account.authority.equals(signer.publicKey)
  );

  const pool = (await getPools())[0];

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
      link: {
        userAccount: LinkGeneratorUtil.generateAccountLink(
          user.publicKey.toBase58()
        ),
        userTokenAccount: LinkGeneratorUtil.generateAccountLink(
          tokenAccount.address.toBase58()
        ),
      },
      pool: {
        name: pool?.name,
        publicKey: pool?.publicKey,
      },
    });
  }

  console.log(`${LOG_KEY} Token accounts for each user are fetched.`);
  console.log(
    `${LOG_KEY} Total ${result.length} users are found for the pool.`
  );

  return result;
};
