'use client'

import { getGametokenpoolProgram, getGametokenpoolProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../ui/ui-layout'

export function useGametokenpoolProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getGametokenpoolProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getGametokenpoolProgram(provider, programId), [provider, programId])

  const accounts = useQuery({
    queryKey: ['gametokenpool', 'all', { cluster }],
    queryFn: () => program.account.gametokenpool.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const initialize = useMutation({
    mutationKey: ['gametokenpool', 'initialize', { cluster }],
    mutationFn: (keypair: Keypair) =>
      program.methods.initialize().accounts({ gametokenpool: keypair.publicKey }).signers([keypair]).rpc(),
    onSuccess: (signature) => {
      transactionToast(signature)
      return accounts.refetch()
    },
    onError: () => toast.error('Failed to initialize account'),
  })

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    initialize,
  }
}

export function useGametokenpoolProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, accounts } = useGametokenpoolProgram()

  const accountQuery = useQuery({
    queryKey: ['gametokenpool', 'fetch', { cluster, account }],
    queryFn: () => program.account.gametokenpool.fetch(account),
  })

  const closeMutation = useMutation({
    mutationKey: ['gametokenpool', 'close', { cluster, account }],
    mutationFn: () => program.methods.close().accounts({ gametokenpool: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accounts.refetch()
    },
  })

  const decrementMutation = useMutation({
    mutationKey: ['gametokenpool', 'decrement', { cluster, account }],
    mutationFn: () => program.methods.decrement().accounts({ gametokenpool: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  const incrementMutation = useMutation({
    mutationKey: ['gametokenpool', 'increment', { cluster, account }],
    mutationFn: () => program.methods.increment().accounts({ gametokenpool: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  const setMutation = useMutation({
    mutationKey: ['gametokenpool', 'set', { cluster, account }],
    mutationFn: (value: number) => program.methods.set(value).accounts({ gametokenpool: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  return {
    accountQuery,
    closeMutation,
    decrementMutation,
    incrementMutation,
    setMutation,
  }
}
