// types/index.ts

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
  }
  
  export interface TransactionDetails {
    hash: string;
    network: string;
    status: string;
    timestamp: string;
    from: string;
    to: string;
    value: string;
    gasUsed: string;
    gasPrice: string;
  }
  
  export interface TransferDetails {
    type: 'native' | 'token' | 'nft';
    from: string;
    to: string;
    amount?: string;
    tokenAddress?: string;
    tokenId?: string;
    tokenName?: string;
    tokenSymbol?: string;
  }