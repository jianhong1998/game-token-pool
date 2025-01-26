'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '../solana/solana-provider'
import { AppHero, ellipsify } from '../ui/ui-layout'
import { ExplorerLink } from '../cluster/cluster-ui'
import { useGametokenpoolProgram } from './gametokenpool-data-access'
import { GametokenpoolCreate, GametokenpoolList } from './gametokenpool-ui'

export default function GametokenpoolFeature() {
  const { publicKey } = useWallet()
  const { programId } = useGametokenpoolProgram()

  return publicKey ? (
    <div>
      <AppHero
        title="Gametokenpool"
        subtitle={
          'Create a new account by clicking the "Create" button. The state of a account is stored on-chain and can be manipulated by calling the program\'s methods (increment, decrement, set, and close).'
        }
      >
        <p className="mb-6">
          <ExplorerLink path={`account/${programId}`} label={ellipsify(programId.toString())} />
        </p>
        <GametokenpoolCreate />
      </AppHero>
      <GametokenpoolList />
    </div>
  ) : (
    <div className="max-w-4xl mx-auto">
      <div className="hero py-[64px]">
        <div className="hero-content text-center">
          <WalletButton />
        </div>
      </div>
    </div>
  )
}
