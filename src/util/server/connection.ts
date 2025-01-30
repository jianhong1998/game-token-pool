import { ANCHOR_WALLET, SOLANA_CLUSTER_TYPE } from '@/constants';
import { AnchorProvider, Program, setProvider } from '@coral-xyz/anchor';
import {
  getGametokenpoolProgram,
  getGametokenpoolProgramId,
} from '@project/anchor';
import { clusterApiUrl, Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Gametokenpool } from '../../../anchor/target/types/gametokenpool';
import { FileUtil } from './file.util';
import { ClusterType } from '@/types/cluster-type.type';

interface IConnectionMapValue {
  connection: Connection;
  endpoint: string;
}

export class ConnectionUtil {
  public connectionMap: Map<string, IConnectionMapValue> = new Map([
    [
      'localnet',
      {
        connection: new Connection('http://localhost:8899', 'confirmed'),
        endpoint: 'http://localhost:8899',
      },
    ],
    [
      'devnet',
      {
        connection: new Connection(clusterApiUrl('devnet'), 'confirmed'),
        endpoint: clusterApiUrl('devnet'),
      },
    ],
    [
      'testnet',
      {
        connection: new Connection(clusterApiUrl('testnet'), 'confirmed'),
        endpoint: clusterApiUrl('testnet'),
      },
    ],
    [
      'mainnet-beta',
      {
        connection: new Connection(clusterApiUrl('mainnet-beta'), 'confirmed'),
        endpoint: clusterApiUrl('mainnet-beta'),
      },
    ],
  ]);

  public provider: AnchorProvider;
  public program: Program<Gametokenpool>;
  public signerKeypair: Keypair;

  private static self: ConnectionUtil;

  private constructor() {
    const connectionValue = this.connectionMap.get(SOLANA_CLUSTER_TYPE);

    if (!connectionValue)
      throw new Error(`Invalid cluster type: ${SOLANA_CLUSTER_TYPE}`);

    const { endpoint: url } = connectionValue;

    this.provider = AnchorProvider.local(url);
    setProvider(this.provider);

    const clusterType = SOLANA_CLUSTER_TYPE as ClusterType;
    const programId = getGametokenpoolProgramId(clusterType);
    this.program = getGametokenpoolProgram(this.provider, programId);

    const anchorWalletString = FileUtil.readFile(ANCHOR_WALLET);
    this.signerKeypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(anchorWalletString) as number[])
    );
  }

  public static getConnection() {
    const self = this.getSelf();

    const connection = self.connectionMap.get(SOLANA_CLUSTER_TYPE)?.connection;

    if (!connection)
      throw new Error(`Invalid SOLANA_CLUSTER_TYPE: ${SOLANA_CLUSTER_TYPE}`);

    return connection;
  }

  public static getProvider(): AnchorProvider {
    return this.getSelf().provider;
  }

  public static getProgram(): Program<Gametokenpool> {
    return this.getSelf().program;
  }

  public static getWallet() {
    const provider = this.getSelf().provider;

    return provider.wallet;
  }

  public static getSigner() {
    return this.getSelf().signerKeypair;
  }

  private static getSelf(): ConnectionUtil {
    if (!this.self) {
      this.self = new ConnectionUtil();
    }

    return this.self;
  }
}
