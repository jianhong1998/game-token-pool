import { Program } from '@coral-xyz/anchor';
import { Gametokenpool } from '../../target/types/gametokenpool';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from '@solana/web3.js';
import {
  IS_TESTING_ON_CHAIN,
  TEST_FEE_PAYER_ID_FILE_PATH,
  TEST_PROGRAM_OWNER_ID_FILE_PATH,
} from '../constants';
import { AccountUtil } from '../utils/account.util';
import { ProgramUtil } from '../utils/program.util';
import { createPool, createPoolTokenAccount } from '../test-functions/init';
import {
  addUser,
  findUserPublicKey,
  findUserTokenAccountPublicKey,
} from '../test-functions/add-user';
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

    const userTokenAccountPublicKey = findUserTokenAccountPublicKey(
      testUserName,
      testData.keypairs.feePayer.publicKey,
      testData.program.programId
    );

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
});
