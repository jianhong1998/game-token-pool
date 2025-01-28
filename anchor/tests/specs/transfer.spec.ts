import { Program } from '@coral-xyz/anchor';
import { airdropIfRequired } from '@solana-developers/helpers';
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Gametokenpool } from '../../target/types/gametokenpool';
import {
  IS_TESTING_ON_CHAIN,
  TEST_FEE_PAYER_ID_FILE_PATH,
  TEST_PROGRAM_OWNER_ID_FILE_PATH,
} from '../constants';
import { createPool, createPoolTokenAccount } from '../test-functions/init';
import { AccountUtil } from '../utils/account.util';
import { ProgramUtil } from '../utils/program.util';
import { addUser, findUserPublicKey } from '../test-functions/add-user';
import { BN } from 'bn.js';

interface ITestData {
  program: Program<Gametokenpool>;
  keypairs: {
    feePayer: Keypair;
    programOwner: Keypair;
  };
  publicKeys: {
    pool: PublicKey;
    users: { account: PublicKey; tokenAccount: PublicKey }[];
  };
}

describe('Test transfering token between users', () => {
  let testData: ITestData;
  const TEST_USER_NAME_1 = 'test user 1';
  const TEST_USER_NAME_2 = 'test user 2';
  const TEST_USER_1_INITIAL_AMOUNT = 10_00;
  const TEST_USER_2_INITIAL_AMOUNT = 10_00;

  beforeAll(async () => {
    const feePayer = await AccountUtil.getAccount(TEST_FEE_PAYER_ID_FILE_PATH);
    const programOwner = await AccountUtil.getAccount(
      TEST_PROGRAM_OWNER_ID_FILE_PATH
    );

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

    const signers = [feePayer];

    /*
      STEP - Initialise Pool
    */

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
        signers,
      });
      await createPoolTokenAccount({
        program,
        signers,
      });

      console.log(`[Before All] Pool is created successfully`);
    }

    /*
      STEP - Initialise user account
    */

    const userAccountPublicKey1 = findUserPublicKey(
      TEST_USER_NAME_1,
      signers[0].publicKey,
      program.programId
    );
    const userAccountPublicKey2 = findUserPublicKey(
      TEST_USER_NAME_2,
      signers[0].publicKey,
      program.programId
    );

    try {
      await program.account.user.fetch(userAccountPublicKey1);
      console.log(`[Before All] User 1 is initialised already`);
    } catch (error) {
      console.log(
        `[Before All] User 1 (${userAccountPublicKey1}) is not initialised yet`
      );
      const transactionId = await addUser({
        program,
        signers,
        depositAmount: TEST_USER_1_INITIAL_AMOUNT,
        userName: TEST_USER_NAME_1,
      });
      console.log(
        `[Before All] User 1 is created successfully: ${transactionId}`
      );
    }

    try {
      await program.account.user.fetch(userAccountPublicKey2);
      console.log(`[Before All] User 2 is initialised already`);
    } catch (error) {
      console.log(
        `[Before All] User 2 (${userAccountPublicKey2}) is not initialised yet`
      );
      const transactionId = await addUser({
        program,
        signers,
        depositAmount: TEST_USER_2_INITIAL_AMOUNT,
        userName: TEST_USER_NAME_2,
      });
      console.log(
        `[Before All] User 2 is created successfully: ${transactionId}`
      );
    }

    const userTokenAccountPublicKey1 = (
      await program.account.user.fetch(userAccountPublicKey1)
    ).tokenAccount;
    const userTokenAccountPublicKey2 = (
      await program.account.user.fetch(userAccountPublicKey2)
    ).tokenAccount;

    testData = {
      program,
      keypairs: {
        feePayer,
        programOwner,
      },
      publicKeys: {
        pool: poolPublicKey,
        users: [
          {
            account: userAccountPublicKey1,
            tokenAccount: userTokenAccountPublicKey1,
          },
          {
            account: userAccountPublicKey2,
            tokenAccount: userTokenAccountPublicKey2,
          },
        ],
      },
    };

    console.log({
      program: testData.program.programId.toBase58(),
      feePayer: testData.keypairs.feePayer.publicKey.toBase58(),
      programOwner: testData.keypairs.programOwner.publicKey.toBase58(),
      poolPublicKey: testData.publicKeys.pool.toBase58(),
      userAccountPublicKey1: testData.publicKeys.users[0].account.toBase58(),
      userAccountPublicKey2: testData.publicKeys.users[1].account.toBase58(),
      userTokenAccountPublicKey1:
        testData.publicKeys.users[0].tokenAccount.toBase58(),
      userTokenAccountPublicKey2:
        testData.publicKeys.users[1].tokenAccount.toBase58(),
    });

    console.log('[Before All] Setup completed ✅');
  }, 30_000);

  it('should be able to transfer token from one user to another user', async () => {
    const user1 = testData.publicKeys.users[0];
    const user2 = testData.publicKeys.users[1];
    const testTransferAmount = 1_10; // RM 1.10
    const program = testData.program;
    const signers = [testData.keypairs.feePayer];

    const expectedUser1PostAmount =
      TEST_USER_1_INITIAL_AMOUNT - testTransferAmount;
    const expectedUser2PostAmount =
      TEST_USER_2_INITIAL_AMOUNT + testTransferAmount;

    const user1CurrectAmount = (
      await getAccount(program.provider.connection, user1.tokenAccount)
    ).amount;
    const user2CurrectAmount = (
      await getAccount(program.provider.connection, user2.tokenAccount)
    ).amount;

    expect(Number(user1CurrectAmount)).toEqual(10_00);
    expect(Number(user2CurrectAmount)).toEqual(10_00);

    const transactionId = await program.methods
      .transferTokenBetweenUsers(
        TEST_USER_NAME_1,
        TEST_USER_NAME_2,
        new BN(testTransferAmount)
      )
      .accounts({
        tokenProgram: TOKEN_PROGRAM_ID,
        signer: signers[0].publicKey,
      })
      .signers(signers)
      .rpc();

    console.log(
      `Transaction for amount transfer is completed: ${transactionId}`
    );

    const user1PostAmount = (
      await getAccount(program.provider.connection, user1.tokenAccount)
    ).amount;
    const user2PostAmount = (
      await getAccount(program.provider.connection, user2.tokenAccount)
    ).amount;

    expect(user1PostAmount).toEqual(BigInt(expectedUser1PostAmount));
    expect(user2PostAmount).toEqual(BigInt(expectedUser2PostAmount));
  }, 30_000);
});
