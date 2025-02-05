import { getExplorerLink } from '@solana-developers/helpers';
import { ConnectionUtil } from '../server/connection';

export class LinkGeneratorUtil {
  private constructor() {}

  public static generateAccountLink(publicKey: string): string {
    const clusterType = ConnectionUtil.getClusterType();

    return getExplorerLink('address', publicKey, clusterType);
  }
}
