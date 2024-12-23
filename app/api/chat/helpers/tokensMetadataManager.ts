import {
  Connection,
  PublicKey
} from '@solana/web3.js';
import { Metadata } from '@metaplex-foundation/mpl-token-metadata';

export class TokenMetadataManager {
  private static instance: TokenMetadataManager;
  private metadataCache: Map<string, any>;
  private readonly METADATA_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';

  private constructor() {
    this.metadataCache = new Map();
  }

  static getInstance(): TokenMetadataManager {
    if (!TokenMetadataManager.instance) {
      TokenMetadataManager.instance = new TokenMetadataManager();
    }
    return TokenMetadataManager.instance;
  }

  private async getMetaplexMetadata(connection: Connection, mintAddress: string) {
    try {
      const metadataPDA = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          new PublicKey(this.METADATA_PROGRAM_ID).toBytes(),
          new PublicKey(mintAddress).toBytes(),
        ],
        new PublicKey(this.METADATA_PROGRAM_ID)
      )[0];

      const metadataAccount = await connection.getAccountInfo(metadataPDA);
      if (!metadataAccount) {
        return null;
      }

      const metadata = Metadata.deserialize(metadataAccount.data)[0];
      return metadata;
    } catch (error) {
      console.error('Error fetching Metaplex metadata:', error);
      return null;
    }
  }

  private async getMintInfo(connection: Connection, mintAddress: string) {
    try {
      const mintInfo = await connection.getParsedAccountInfo(new PublicKey(mintAddress));
      if (!mintInfo.value) {
        throw new Error('Mint account not found');
      }

      const parsedData = mintInfo.value.data;
      if (!('parsed' in parsedData)) {
        throw new Error('Unable to parse mint data');
      }

      return parsedData.parsed;
    } catch (error) {
      console.error('Error fetching mint info:', error);
      return null;
    }
  }

  async getTokenMetadata(connection: Connection, mintAddress: string, tokenType: string = 'SPL') {
    try {
      // Check cache first
      const cacheKey = `${mintAddress}-${tokenType}`;
      const cachedMetadata = this.metadataCache.get(cacheKey);
      if (cachedMetadata && Date.now() - cachedMetadata.timestamp < 3600000) { // 1 hour cache
        return cachedMetadata;
      }

      let metadata: any = {
        address: mintAddress,
        type: tokenType,
        timestamp: Date.now()
      };

      // Get basic mint info
      const mintInfo = await this.getMintInfo(connection, mintAddress);
      if (!mintInfo) {
        throw new Error('Failed to fetch mint info');
      }

      metadata = {
        ...metadata,
        decimals: mintInfo.decimals,
        supply: mintInfo.supply,
        isInitialized: mintInfo.isInitialized
      };

      // For NFTs and tokens with metadata, fetch Metaplex metadata
      if (tokenType === 'NFT' || tokenType === 'SPL') {
        const metaplexData = await this.getMetaplexMetadata(connection, mintAddress);
        if (metaplexData) {
          metadata = {
            ...metadata,
            name: metaplexData.data.name,
            symbol: metaplexData.data.symbol,
            uri: metaplexData.data.uri,
            sellerFeeBasisPoints: metaplexData.data.sellerFeeBasisPoints,
            creators: metaplexData.data.creators,
            collection: metaplexData.collection,
            uses: metaplexData.uses
          };
        }
      }

      // Additional NFT-specific checks
      if (tokenType === 'NFT') {
        metadata.isNFT = mintInfo.decimals === 0 && mintInfo.supply === '1';
      }

      // Cache the result
      this.metadataCache.set(cacheKey, metadata);

      return metadata;
    } catch (error) {
      console.error('Error getting token metadata:', error);
      return {
        address: mintAddress,
        type: tokenType,
        error: 'Failed to fetch metadata'
      };
    }
  }

  clearCache() {
    this.metadataCache.clear();
  }
}