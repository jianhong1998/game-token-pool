import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { Gametokenpool } from '../../target/types/gametokenpool';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { BN } from 'bn.js';

export const addUser = async (params: {
  userName: string;
  depositAmount: number;
  signers: Keypair[];
  program: Program<Gametokenpool>;
  sendPreflight?: boolean;
}) => {
  const { program, signers, userName, sendPreflight, depositAmount } = params;

  if (signers.length === 0) {
    throw new Error('Signer must be more than 1');
  }

  return await program.methods
    .addUserToPool(userName, new BN(depositAmount))
    .accounts({
      tokenProgram: TOKEN_PROGRAM_ID,
      signer: signers[0].publicKey,
    })
    .signers(signers)
    .rpc({
      skipPreflight: !sendPreflight,
    });
};

export const findUserPublicKey = (
  userName: string,
  signerPublicKey: PublicKey,
  programId: PublicKey
): PublicKey => {
  const seeds = [
    Buffer.from('user'),
    Buffer.from(userName),
    signerPublicKey.toBuffer(),
  ];
  const [userAccountPublicKey] = PublicKey.findProgramAddressSync(
    seeds,
    programId
  );

  return userAccountPublicKey;
};

export const findUserTokenAccountPublicKey = (
  userName: string,
  signerPublicKey: PublicKey,
  programId: PublicKey
): PublicKey => {
  const userAccountPublicKey = findUserPublicKey(
    userName,
    signerPublicKey,
    programId
  );

  const seeds = [userAccountPublicKey.toBuffer()];

  const [userTokenAccountPublicKey] = PublicKey.findProgramAddressSync(
    seeds,
    programId
  );

  return userTokenAccountPublicKey;
};
