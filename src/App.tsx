import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { useCallback, useEffect, useMemo, useState } from 'react'

import './App.css'
import { getVaultPda, useProgram } from './useProgram'

const PROGRAM_ID = '2hnH8zWi3JCcoCeqqCPJSmXeXfu8Zg18oTnvFEaBpWQB'
const EXPLORER_TX_BASE = 'https://explorer.solana.com/tx'
const EXPLORER_PROGRAM_URL = `https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`

type VaultView = {
  owner: PublicKey
  bump: number
}

function shortenAddress(address: PublicKey | string) {
  const value = address.toString()
  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

function formatSol(lamports: number | null) {
  if (lamports === null) {
    return '0 SOL'
  }

  return `${(lamports / LAMPORTS_PER_SOL).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })} SOL`
}

function App() {
  const { publicKey, connected } = useWallet()
  const { connection, deposit, fetchVaultAccount, withdraw } = useProgram()
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [vaultBalance, setVaultBalance] = useState<number | null>(null)
  const [vaultAccount, setVaultAccount] = useState<VaultView | null>(null)
  const [depositAmount, setDepositAmount] = useState('0.1')
  const [status, setStatus] = useState('Connect a wallet to manage your SolLock vault.')
  const [signature, setSignature] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const vaultPda = useMemo(() => {
    if (!publicKey) {
      return null
    }

    return getVaultPda(publicKey)[0]
  }, [publicKey])

  const walletOwnsVault = Boolean(
    publicKey && vaultAccount?.owner.equals(publicKey),
  )

  const refreshVault = useCallback(async () => {
    if (!publicKey || !vaultPda) {
      setWalletBalance(null)
      setVaultBalance(null)
      setVaultAccount(null)
      return
    }

    const [nextWalletBalance, nextVaultBalance, nextVaultAccount] =
      await Promise.all([
        connection.getBalance(publicKey),
        connection.getBalance(vaultPda),
        fetchVaultAccount(publicKey),
      ])

    setWalletBalance(nextWalletBalance)
    setVaultBalance(nextVaultBalance)
    setVaultAccount(nextVaultAccount)
  }, [connection, fetchVaultAccount, publicKey, vaultPda])

  useEffect(() => {
    void refreshVault().catch((error: unknown) => {
      setStatus(error instanceof Error ? error.message : 'Failed to load vault state.')
    })
  }, [refreshVault])

  async function handleDeposit() {
    const amount = Number(depositAmount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setStatus('Enter a SOL amount greater than zero.')
      return
    }

    setIsBusy(true)
    setSignature(null)
    setStatus('Depositing SOL into your vault...')

    try {
      const nextSignature = await deposit(amount)
      setSignature(nextSignature)
      setStatus('Deposit confirmed on devnet.')
      await refreshVault()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Deposit failed.')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleWithdraw() {
    setIsBusy(true)
    setSignature(null)
    setStatus('Withdrawing available SOL from your vault...')

    try {
      const nextSignature = await withdraw()
      setSignature(nextSignature)
      setStatus('Withdraw confirmed on devnet.')
      await refreshVault()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Withdraw failed.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <main className="page-shell">
      <section className="app-card">
        <header className="app-header">
          <div>
            {/* Edit this placeholder with your actual university/course name. */}
            <p className="course-label">SolLock — University Of Management and Technology </p>
            <p className="eyebrow">Devnet Locker</p>
            <h1>SolLock</h1>
            <p className="subtitle">On-chain SOL Escrow - Devnet</p>
          </div>
          <WalletMultiButton />
        </header>

        <section className="info-grid">
          <div className="info-panel">
            <span>Wallet</span>
            <strong>{publicKey ? shortenAddress(publicKey) : 'Not connected'}</strong>
            <small>{connected ? formatSol(walletBalance) : 'Connect Phantom'}</small>
          </div>
          <div className="info-panel">
            <span>Vault PDA</span>
            <strong>{vaultPda ? shortenAddress(vaultPda) : 'Unavailable'}</strong>
            <small>{vaultPda ? vaultPda.toString() : 'Derived after wallet connect'}</small>
          </div>
          <div className="info-panel">
            <span>Vault Balance</span>
            <strong>{formatSol(vaultBalance)}</strong>
            <small>
              {walletOwnsVault
                ? `Owner ${shortenAddress(vaultAccount!.owner)}`
                : vaultAccount
                  ? 'Connected wallet is not the vault owner'
                  : 'Vault not initialized'}
            </small>
          </div>
        </section>

        <section className="action-grid">
          <div className="action-panel">
            <div>
              <h2>Deposit</h2>
              <p>Send SOL from your connected wallet into its vault PDA.</p>
            </div>
            <label className="amount-field">
              <span>SOL amount</span>
              <input
                min="0"
                step="0.01"
                inputMode="decimal"
                value={depositAmount}
                onChange={(event) => setDepositAmount(event.target.value)}
                type="number"
              />
            </label>
            <button disabled={!publicKey || isBusy} onClick={handleDeposit} type="button">
              Deposit
            </button>
          </div>

          <div className="action-panel">
            <div>
              <h2>Withdraw</h2>
              <p>Withdraw the available vault balance while preserving rent exemption.</p>
            </div>
            <button
              disabled={!publicKey || !walletOwnsVault || isBusy}
              onClick={handleWithdraw}
              type="button"
            >
              Withdraw
            </button>
          </div>
        </section>

        <section className="status-panel">
          <span>Status</span>
          <p>{status}</p>
          {signature ? (
            <a
              href={`${EXPLORER_TX_BASE}/${signature}?cluster=devnet`}
              rel="noreferrer"
              target="_blank"
            >
              View transaction {shortenAddress(signature)}
            </a>
          ) : null}
        </section>

        <footer>
          <span>Built on Solana Devnet</span>
          <a href={EXPLORER_PROGRAM_URL} rel="noreferrer" target="_blank">
            Program {shortenAddress(PROGRAM_ID)}
          </a>
        </footer>
      </section>
    </main>
  )
}

export default App
