'use server';

import { ErrorCode } from '@/constants/error';
import { ConnectionUtil } from '@/util/server/connection';
import { ErrorUtil } from '@/util/shared/error.util';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';

type UserLoginResponse =
  | {
      isLoginSuccess: true;
      username: string;
      publicKey: string;
    }
  | {
      isLoginSuccess: false;
      errorMessage: string;
    };

type userRegisterResponse =
  | {
      isLoginSuccess: true;
      username: string;
    }
  | {
      isLoginSuccess: false;
      errorMessage: string;
    };

export const userLogin = async (params: {
  username: string;
}): Promise<UserLoginResponse> => {
  const { username } = params;
  const wallet = ConnectionUtil.getWallet();
  const program = ConnectionUtil.getProgram();

  const [userPublicKey] = PublicKey.findProgramAddressSync(
    [Buffer.from('user'), Buffer.from(username), wallet.publicKey.toBuffer()],
    program.programId
  );

  try {
    await program.account.user.fetch(userPublicKey);

    console.log(`[User Login] User (${userPublicKey}) login success.`);

    return {
      isLoginSuccess: true,
      publicKey: userPublicKey.toBase58(),
      username,
    };
  } catch (error) {
    const errorMessage = (error as Error).message;

    if (ErrorUtil.isUserNotFoundError(errorMessage)) {
      return {
        isLoginSuccess: false,
        errorMessage: ErrorCode.USER_NOT_EXIST,
      };
    }

    return {
      isLoginSuccess: false,
      errorMessage,
    };
  }
};

export const userRegister = async (params: {
  username: string;
}): Promise<userRegisterResponse> => {
  const { username } = params;

  const signer = ConnectionUtil.getSigner();
  const program = ConnectionUtil.getProgram();

  try {
    const transactionId = await program.methods
      .addUserToPool(username, new BN(0))
      .accounts({
        tokenProgram: TOKEN_PROGRAM_ID,
        signer: signer.publicKey,
      })
      .signers([signer])
      .rpc();

    console.log(`[Add User] ${transactionId}`);

    return {
      isLoginSuccess: true,
      username,
    };
  } catch (error) {
    const errorMessage = (error as Error).message;
    return {
      isLoginSuccess: false,
      errorMessage,
    };
  }
};
