import * as anchor from '@coral-xyz/anchor'
import {Program} from '@coral-xyz/anchor'
import {Keypair} from '@solana/web3.js'
import {Gametokenpool} from '../target/types/gametokenpool'

describe('gametokenpool', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const payer = provider.wallet as anchor.Wallet

  const program = anchor.workspace.Gametokenpool as Program<Gametokenpool>

  const gametokenpoolKeypair = Keypair.generate()

  it('Initialize Gametokenpool', async () => {
    await program.methods
      .initialize()
      .accounts({
        gametokenpool: gametokenpoolKeypair.publicKey,
        payer: payer.publicKey,
      })
      .signers([gametokenpoolKeypair])
      .rpc()

    const currentCount = await program.account.gametokenpool.fetch(gametokenpoolKeypair.publicKey)

    expect(currentCount.count).toEqual(0)
  })

  it('Increment Gametokenpool', async () => {
    await program.methods.increment().accounts({ gametokenpool: gametokenpoolKeypair.publicKey }).rpc()

    const currentCount = await program.account.gametokenpool.fetch(gametokenpoolKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Increment Gametokenpool Again', async () => {
    await program.methods.increment().accounts({ gametokenpool: gametokenpoolKeypair.publicKey }).rpc()

    const currentCount = await program.account.gametokenpool.fetch(gametokenpoolKeypair.publicKey)

    expect(currentCount.count).toEqual(2)
  })

  it('Decrement Gametokenpool', async () => {
    await program.methods.decrement().accounts({ gametokenpool: gametokenpoolKeypair.publicKey }).rpc()

    const currentCount = await program.account.gametokenpool.fetch(gametokenpoolKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Set gametokenpool value', async () => {
    await program.methods.set(42).accounts({ gametokenpool: gametokenpoolKeypair.publicKey }).rpc()

    const currentCount = await program.account.gametokenpool.fetch(gametokenpoolKeypair.publicKey)

    expect(currentCount.count).toEqual(42)
  })

  it('Set close the gametokenpool account', async () => {
    await program.methods
      .close()
      .accounts({
        payer: payer.publicKey,
        gametokenpool: gametokenpoolKeypair.publicKey,
      })
      .rpc()

    // The account should no longer exist, returning null.
    const userAccount = await program.account.gametokenpool.fetchNullable(gametokenpoolKeypair.publicKey)
    expect(userAccount).toBeNull()
  })
})
