import { PublicKey } from '@solana/web3.js';
import { ConnectionUtil } from './connection';

export class AccountUtil {
  private constructor() {}

  public static getUserPublicKey(username: string): PublicKey {
    const program = ConnectionUtil.getProgram();
    const signer = ConnectionUtil.getSigner();

    const [userPublicKey] = PublicKey.findProgramAddressSync(
      [Buffer.from('user'), Buffer.from(username), signer.publicKey.toBuffer()],
      program.programId
    );

    return userPublicKey;
  }
}
