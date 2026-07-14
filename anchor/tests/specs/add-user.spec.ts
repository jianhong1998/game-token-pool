import { Program } from '@anchor-lang/core';
import { Gametokenpool } from '../../target/types/gametokenpool';
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import {
  TEST_FEE_PAYER_ID_FILE_PATH,
  TEST_PROGRAM_OWNER_ID_FILE_PATH,
} from '../constants';
import { AccountUtil } from '../utils/account.util';
import { ProgramUtil } from '../utils/program.util';
import { createPool, createPoolTokenAccount } from '../test-functions/init';
import { addUser, findUserPublicKey } from '../test-functions/add-user';
import { airdropIfRequired } from '@solana-developers/helpers';
import { BN } from 'bn.js';

interface ITestData {
  program: Program<Gametokenpool>;
  keypairs: {
    feePayer: Keypair;
    programOwner: Keypair;
  };
  publicKeys: {
    pool: PublicKey;
  };
}

describe('Test add user', () => {
  let testData: ITestData;
  const POOL_NAME = 'test pool';

  beforeAll(async () => {
    const feePayer = await AccountUtil.getAccount(TEST_FEE_PAYER_ID_FILE_PATH);
    const programOwner = await AccountUtil.getAccount(
      TEST_PROGRAM_OWNER_ID_FILE_PATH
    );

    const programUtil = new ProgramUtil<Gametokenpool>();

    const program = await programUtil.getProgram();

    const [poolPublicKey] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), feePayer.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.account.pool.fetch(poolPublicKey);

      console.log(`[Before All] Pool is already initialized`);
    } catch (error) {
      console.log(`[Before All] Pool is not yet initialized`);
      console.log('Check account balance and require airdrop if needed');
      // Both the fee payer (the "signer" business account) and the
      // provider/program-owner wallet (which Anchor's MethodsBuilder uses as
      // the transaction fee payer by default) need SOL on a fresh surfpool
      // instance -- surfpool only auto-funds enough to cover program deploy,
      // not ongoing test-transaction fees.
      await airdropIfRequired(
        program.provider.connection,
        feePayer.publicKey,
        10 * LAMPORTS_PER_SOL,
        5 * LAMPORTS_PER_SOL
      );
      await airdropIfRequired(
        program.provider.connection,
        programOwner.publicKey,
        10 * LAMPORTS_PER_SOL,
        5 * LAMPORTS_PER_SOL
      );

      await createPool({
        program,
        poolName: POOL_NAME,
        signers: [feePayer],
      });
      await createPoolTokenAccount({
        program,
        signers: [feePayer],
      });

      console.log(`[Before All] Pool is created successfully`);
    }

    testData = {
      program,
      keypairs: {
        feePayer,
        programOwner,
      },
      publicKeys: {
        pool: poolPublicKey,
      },
    };

    console.log({
      program: testData.program.programId.toBase58(),
      feePayer: testData.keypairs.feePayer.publicKey.toBase58(),
      programOwner: testData.keypairs.programOwner.publicKey.toBase58(),
      poolPublicKey: testData.publicKeys.pool.toBase58(),
    });
  }, 30000);

  it('should create user with token', async () => {
    const testUserName = 'asv';
    const testDepositAmount = 1000; // RM 10.00

    const transactionId = await addUser({
      program: testData.program,
      depositAmount: testDepositAmount,
      userName: testUserName,
      signers: [testData.keypairs.feePayer],
    });

    const userAccountPublicKey = findUserPublicKey(
      testUserName,
      testData.keypairs.feePayer.publicKey,
      testData.program.programId
    );

    const userTokenAccountPublicKey = (
      await testData.program.account.user.fetch(userAccountPublicKey)
    ).tokenAccount;

    console.log({
      transactionId,
      userAccountPublicKey: userAccountPublicKey.toBase58(),
      userTokenAccountPublicKey: userTokenAccountPublicKey.toBase58(),
    });

    const userAccount = await testData.program.account.user.fetch(
      userAccountPublicKey
    );

    console.log({ userAccount });

    expect(userAccount.authority.toBase58()).toBe(
      testData.keypairs.feePayer.publicKey.toBase58()
    );
    expect(userAccount.name).toBe(testUserName);
    expect(userAccount.totalDepositedAmount.eq(new BN(1000))).toBeTruthy();
  }, 30000);

  it('should create a user whose name fills the full 32-char max_len', async () => {
    // User::INIT_SPACE with max_len(32) = 32(authority)+36(name:4+32)+8+1+32+1 = 110.
    // Without the discriminator fix: alloc=110, actual write=8(discriminator)+110(data)=118 > 110 -> overflow.
    // With the fix: alloc=118 (110+8), write=118 -> fits exactly. 32 chars is also the real
    // ceiling: Solana caps each PDA seed at 32 bytes, and the user PDA seeds directly on the
    // raw username bytes, so no username over 32 chars can exist at all regardless of this bug.
    const longUsername = 'a'.repeat(32);

    await addUser({
      program: testData.program,
      depositAmount: 0,
      userName: longUsername,
      signers: [testData.keypairs.feePayer],
    });

    const userPublicKey = findUserPublicKey(
      longUsername,
      testData.keypairs.feePayer.publicKey,
      testData.program.programId
    );
    const user = await testData.program.account.user.fetch(userPublicKey);

    expect(user.name).toEqual(longUsername);
  }, 30000);
});
