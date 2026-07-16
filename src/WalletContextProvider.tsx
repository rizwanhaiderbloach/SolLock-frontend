import { clusterApiUrl } from '@solana/web3.js'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'
import { useMemo } from 'react'
import type { PropsWithChildren } from 'react'

import '@solana/wallet-adapter-react-ui/styles.css'

export function WalletContextProvider({ children }: PropsWithChildren) {
  const endpoint = useMemo(() => 'https://devnet.helius-rpc.com/?api-key=34ec8d48-0450-4b58-8040-16be826a710d', [])
  const wallets = useMemo(() => [new PhantomWalletAdapter()], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
