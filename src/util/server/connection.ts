import {
  SOLANA_CLUSTER_PROVIDER,
  FEE_PAYER,
  SOLANA_CLUSTER_TYPE,
} from '@/constants';
import { AnchorProvider, Program, setProvider } from '@coral-xyz/anchor';
import {
  getGametokenpoolProgram,
  getGametokenpoolProgramId,
} from '@project/anchor';
import { clusterApiUrl, Connection, Keypair } from '@solana/web3.js';
import { Gametokenpool } from '../../../anchor/target/types/gametokenpool';
import { ClusterType } from '@/types/cluster-type.type';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';

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
        connection: new Connection(
          SOLANA_CLUSTER_PROVIDER ?? clusterApiUrl('devnet'),
          'confirmed'
        ),
        endpoint: SOLANA_CLUSTER_PROVIDER ?? clusterApiUrl('devnet'),
      },
    ],
    [
      'testnet',
      {
        connection: new Connection(
          SOLANA_CLUSTER_PROVIDER ?? clusterApiUrl('testnet'),
          'confirmed'
        ),
        endpoint: SOLANA_CLUSTER_PROVIDER ?? clusterApiUrl('testnet'),
      },
    ],
    [
      'mainnet-beta',
      {
        connection: new Connection(
          SOLANA_CLUSTER_PROVIDER ?? clusterApiUrl('mainnet-beta'),
          'confirmed'
        ),
        endpoint: SOLANA_CLUSTER_PROVIDER ?? clusterApiUrl('mainnet-beta'),
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

    const { connection } = connectionValue;

    const signerKeypair = ConnectionUtil.getFeePayerKeypair();
    this.signerKeypair = signerKeypair;

    const wallet = new NodeWallet(signerKeypair);

    this.provider = new AnchorProvider(connection, wallet);
    setProvider(this.provider);

    const clusterType = SOLANA_CLUSTER_TYPE as ClusterType;
    const programId = getGametokenpoolProgramId(clusterType);
    this.program = getGametokenpoolProgram(this.provider, programId);
  }

  public static getConnection(): Connection {
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

  public static getSigner(): Keypair {
    return this.getSelf().signerKeypair;
  }

  public static getClusterType(): ClusterType {
    return SOLANA_CLUSTER_TYPE as ClusterType;
  }

  private static getFeePayerKeypair() {
    const keyString = FEE_PAYER;
    if (!keyString) throw new Error(`Invalid FEE_PAYER_KEY: ${keyString}`);

    const uint8 = Uint8Array.from(JSON.parse(keyString) as number[]);
    return Keypair.fromSecretKey(uint8);
  }

  private static getSelf(): ConnectionUtil {
    if (!this.self) {
      this.self = new ConnectionUtil();
    }

    return this.self;
  }
}
