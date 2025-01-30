import { Keypair } from '@solana/web3.js';
import { FileUtil } from './file.util';

export class AccountUtil {
  private constructor() {}

  public static getAccount(filePath?: string) {
    if (!filePath) {
      return new Keypair();
    }

    const isFileExist = FileUtil.isFileExist(filePath);

    if (!isFileExist) {
      console.warn(`File ${filePath} does not exist, creating a new keypair.`);
      return new Keypair();
    }

    const secretKeyFileContent = FileUtil.readFile(filePath);
    const secretKeyArray = Uint8Array.from(JSON.parse(secretKeyFileContent));

    return Keypair.fromSecretKey(secretKeyArray);
  }
}
