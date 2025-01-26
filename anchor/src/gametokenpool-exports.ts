// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import GametokenpoolIDL from '../target/idl/gametokenpool.json'
import type { Gametokenpool } from '../target/types/gametokenpool'

// Re-export the generated IDL and type
export { Gametokenpool, GametokenpoolIDL }

// The programId is imported from the program IDL.
export const GAMETOKENPOOL_PROGRAM_ID = new PublicKey(GametokenpoolIDL.address)

// This is a helper function to get the Gametokenpool Anchor program.
export function getGametokenpoolProgram(provider: AnchorProvider, address?: PublicKey) {
  return new Program({ ...GametokenpoolIDL, address: address ? address.toBase58() : GametokenpoolIDL.address } as Gametokenpool, provider)
}

// This is a helper function to get the program ID for the Gametokenpool program depending on the cluster.
export function getGametokenpoolProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID for the Gametokenpool program on devnet and testnet.
      return new PublicKey('coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF')
    case 'mainnet-beta':
    default:
      return GAMETOKENPOOL_PROGRAM_ID
  }
}
