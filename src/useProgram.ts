import * as anchor from '@coral-xyz/anchor'
import { AnchorProvider, BN, Program } from '@coral-xyz/anchor'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from '@solana/web3.js'
import { useMemo } from 'react'

import idl from './idl/sollock.json'

const PROGRAM_ID = new PublicKey('2hnH8zWi3JCcoCeqqCPJSmXeXfu8Zg18oTnvFEaBpWQB')
const VAULT_SEED = new TextEncoder().encode('vault')

type VaultAccount = {
  owner: PublicKey
  bump: number
}

type AnchorWallet = {
  publicKey: PublicKey
  signTransaction: anchor.Wallet['signTransaction']
  signAllTransactions: anchor.Wallet['signAllTransactions']
}

type SollockProgram = Program<anchor.Idl> & {
  account: {
    vault: {
      fetchNullable(address: PublicKey): Promise<VaultAccount | null>
    }
  }
  methods: {
    deposit(lamports: BN): {
      accounts(accounts: {
        depositor: PublicKey
        vault: PublicKey
        systemProgram: PublicKey
      }): {
        rpc(): Promise<string>
      }
    }
    withdraw(): {
      accounts(accounts: { owner: PublicKey; vault: PublicKey }): {
        rpc(): Promise<string>
      }
    }
  }
}

export function getVaultPda(ownerPubkey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [VAULT_SEED, ownerPubkey.toBuffer()],
    PROGRAM_ID,
  )
}

export function useProgram() {
  const { connection } = useConnection()
  const wallet = useWallet()

  const provider = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
      return null
    }

    return new AnchorProvider(
      connection,
      wallet as AnchorWallet,
      AnchorProvider.defaultOptions(),
    )
  }, [connection, wallet])

  const program = useMemo(() => {
    if (!provider) {
      return null
    }

    return new Program(idl as anchor.Idl, provider) as SollockProgram
  }, [provider])

  async function fetchVaultAccount(ownerPubkey: PublicKey) {
    if (!program) {
      return null
    }

    const [vaultPda] = getVaultPda(ownerPubkey)
    return (await program.account.vault.fetchNullable(vaultPda)) as VaultAccount | null
  }

  async function deposit(amountSol: number) {
    if (!program || !wallet.publicKey) {
      throw new Error('Connect a wallet before depositing')
    }

    const [vaultPda] = getVaultPda(wallet.publicKey)
    const lamports = new BN(Math.round(amountSol * LAMPORTS_PER_SOL))

    return program.methods
      .deposit(lamports)
      .accounts({
        depositor: wallet.publicKey,
        vault: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc()
  }

  async function withdraw() {
    if (!program || !wallet.publicKey) {
      throw new Error('Connect a wallet before withdrawing')
    }

    const [vaultPda] = getVaultPda(wallet.publicKey)

    return program.methods
      .withdraw()
      .accounts({
        owner: wallet.publicKey,
        vault: vaultPda,
      })
      .rpc()
  }

  return {
    connection,
    deposit,
    fetchVaultAccount,
    getVaultPda,
    program,
    withdraw,
  }
}
