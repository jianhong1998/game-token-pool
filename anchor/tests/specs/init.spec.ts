import * as anchor from '@coral-xyz/anchor';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from '@solana/web3.js';
import { Gametokenpool } from '../../target/types/gametokenpool';
import {
  IS_TESTING_ON_CHAIN,
  TEST_FEE_PAYER_ID_FILE_PATH,
  TEST_PROGRAM_OWNER_ID_FILE_PATH,
} from '../constants';
import { AccountUtil } from '../utils/account.util';
import { ProgramUtil } from '../utils/program.util';
import { createPool, createPoolTokenAccount } from '../test-functions/init';

interface ITestData {
  program: anchor.Program<Gametokenpool>;
  connection: Connection;
  keypairs: {
    feePayer: Keypair;
    programOwner: Keypair;
  };
  publicKeys: {};
}

describe.skip('Test init()', () => {
  let testData: ITestData;
  const POOL_NAME = 'test pool';

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
    const connection = (await programUtil.getProvider()).connection;

    testData = {
      program,
      connection,
      keypairs: {
        feePayer,
        programOwner,
      },
      publicKeys: {},
    };

    console.log({
      program: testData.program.programId.toBase58(),
      feePayer: testData.keypairs.feePayer.publicKey.toBase58(),
      programOwner: testData.keypairs.programOwner.publicKey.toBase58(),
    });
  }, 30000);

  it('should be creating a pool', async () => {
    const signers = [testData.keypairs.feePayer];

    const initPoolTransactionId = await createPool({
      program: testData.program,
      poolName: POOL_NAME,
      signers,
    });

    const initPoolTokenAccountTransactionId = await createPoolTokenAccount({
      program: testData.program,
      signers,
    });

    console.log({ initPoolTransactionId, initPoolTokenAccountTransactionId });

    const [poolPublicKey] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), testData.keypairs.feePayer.publicKey.toBuffer()],
      testData.program.programId
    );

    console.log({
      poolPublicKey: poolPublicKey.toBase58(),
    });

    const pool = await testData.program.account.pool.fetch(poolPublicKey);

    console.log({ pool });
  }, 30000);
});
