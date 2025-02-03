import { Program } from '@coral-xyz/anchor';
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { Gametokenpool } from '../../target/types/gametokenpool';
import { airdropIfRequired } from '@solana-developers/helpers';
import {
  TEST_FEE_PAYER_ID_FILE_PATH,
  TEST_PROGRAM_OWNER_ID_FILE_PATH,
  IS_TESTING_ON_CHAIN,
} from '../constants';
import { createPool, createPoolTokenAccount } from '../test-functions/init';
import { AccountUtil } from '../utils/account.util';
import { ProgramUtil } from '../utils/program.util';
import { addUser, findUserPublicKey } from '../test-functions/add-user';
import { getAccount } from '@solana/spl-token';
import { endGame } from '../test-functions/end-game';

interface ITestData {
  program: Program<Gametokenpool>;
  keypairs: {
    feePayer: Keypair;
    programOwner: Keypair;
  };
  publicKeys: {
    pool: PublicKey;
    poolTokenAccount: PublicKey;
    user: PublicKey;
    userTokenAccount: PublicKey;
  };
}

describe('Test user end game', () => {
  let testData: ITestData;
  const TEST_USER_NAME = 'test user 1';
  const TEST_INITIAL_AMOUNT = 10_00; // RM 10.00
  const POOL_NAME = 'test pool';

  beforeAll(async () => {
    const feePayer = await AccountUtil.getAccount(TEST_FEE_PAYER_ID_FILE_PATH);
    const programOwner = await AccountUtil.getAccount(
      TEST_PROGRAM_OWNER_ID_FILE_PATH
    );
    const signers = [feePayer];

    const programUtil = new ProgramUtil<Gametokenpool>(
      ProgramUtil.generateConstructorParams({
        addedAccounts: [
          AccountUtil.createAddedAccount(feePayer.publicKey, {
            lamports: 10 * LAMPORTS_PER_SOL,
            executable: false,
          }),
          AccountUtil.createAddedAccount(programOwner.publicKey, {
            lamports: 10 * LAMPORTS_PER_SOL,
            executable: false,
          }),
        ],
        addedPrograms: [],
        anchorRootPath: '.',
        isTestingOnChain: IS_TESTING_ON_CHAIN,
      })
    );

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
      if (IS_TESTING_ON_CHAIN) {
        console.log('Check account balance and require airdrop if needed');
        await airdropIfRequired(
          program.provider.connection,
          feePayer.publicKey,
          10,
          5
        );
      }

      await createPool({
        program,
        poolName: POOL_NAME,
        signers,
      });
      await createPoolTokenAccount({
        program,
        signers,
      });

      console.log(`[Before All] Pool is created successfully`);
    }

    const userAccountPublicKey = findUserPublicKey(
      TEST_USER_NAME,
      feePayer.publicKey,
      program.programId
    );

    try {
      await program.account.user.fetch(userAccountPublicKey);
      console.log(`[Before All] User is initialised already`);
    } catch (error) {
      console.log(
        `[Before All] User (${userAccountPublicKey}) is not initialised yet`
      );
      const transactionId = await addUser({
        program,
        signers,
        depositAmount: TEST_INITIAL_AMOUNT,
        userName: TEST_USER_NAME,
      });
      console.log(
        `[Before All] User is created successfully: ${transactionId}`
      );
    }

    const userTokenAccountPublicKey = (
      await program.account.user.fetch(userAccountPublicKey)
    ).tokenAccount;

    const seeds = [
      Buffer.from('pool_token_account'),
      feePayer.publicKey.toBuffer(),
    ];
    const [poolTokenAccountPublicKey] = PublicKey.findProgramAddressSync(
      seeds,
      program.programId
    );

    testData = {
      program,
      keypairs: {
        feePayer,
        programOwner,
      },
      publicKeys: {
        pool: poolPublicKey,
        poolTokenAccount: poolTokenAccountPublicKey,
        user: userAccountPublicKey,
        userTokenAccount: userTokenAccountPublicKey,
      },
    };

    console.log({
      program: testData.program.programId.toBase58(),
      feePayer: testData.keypairs.feePayer.publicKey.toBase58(),
      programOwner: testData.keypairs.programOwner.publicKey.toBase58(),
      pool: testData.publicKeys.pool.toBase58(),
      poolTokenAccount: testData.publicKeys.poolTokenAccount.toBase58(),
      user: testData.publicKeys.user.toBase58(),
      userTokenaccount: userTokenAccountPublicKey.toBase58(),
    });
  }, 30_000);

  it('should able to let user end game and delete user account and user token account', async () => {
    const program = testData.program;
    const signers = [testData.keypairs.feePayer];

    const { amount: initPoolTokenAccountAmount } = await getAccount(
      program.provider.connection,
      testData.publicKeys.poolTokenAccount
    );

    const transactionId = await endGame({
      program,
      signers,
      userName: TEST_USER_NAME,
    });

    console.log(`User end game process successfully: ${transactionId}`);

    // Check token is transfered over to pool token account
    const { amount: postPoolTokenAccountAmount } = await getAccount(
      program.provider.connection,
      testData.publicKeys.poolTokenAccount
    );
    const amountDiff = Number(
      postPoolTokenAccountAmount - initPoolTokenAccountAmount
    );
    expect(Number(postPoolTokenAccountAmount)).toBeGreaterThan(
      Number(initPoolTokenAccountAmount)
    );
    expect(amountDiff).toBe(TEST_INITIAL_AMOUNT);

    // Check user is deleted
    try {
      const user = await program.account.user.fetch(testData.publicKeys.user);
      expect(user).toBe(undefined);
    } catch (error) {
      expect(error).toBeDefined();
    }

    // Check user token account is deleted
    try {
      const userTokenAccount = await getAccount(
        program.provider.connection,
        testData.publicKeys.userTokenAccount
      );
      expect(userTokenAccount).toBeUndefined();
    } catch (error) {
      expect(error).toBeDefined();

      if (IS_TESTING_ON_CHAIN) {
        expect((error as Error).name).toBe('TokenAccountNotFoundError');
      } else {
        expect((error as Error).name).toBe('Error');
      }
    }
  }, 30_000);
});
