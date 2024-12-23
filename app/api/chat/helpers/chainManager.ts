import { Connection, clusterApiUrl } from '@solana/web3.js';

export interface Network {
  name: string;
  cluster: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpc: string[];
}

// Chain data management
export class ChainManager {
  private static instance: ChainManager;
  private networks: Network[] = [
    {
      name: 'Solana Mainnet',
      cluster: 'mainnet-beta',
      nativeCurrency: {
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9
      },
      rpc: [
        'https://fabled-sparkling-general.solana-mainnet.quiknode.pro/040478c57d2932ae55184130eaff1fbe14c33e49',
        'https://api.mainnet-beta.solana.com',
        'https://solana-mainnet.rpc.extrnode.com',
        'https://rpc.ankr.com/solana'
      ]
    },
    {
      name: 'Solana Devnet',
      cluster: 'devnet',
      nativeCurrency: {
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9
      },
      rpc: [
        'https://api.devnet.solana.com',
        clusterApiUrl('devnet')
      ]
    },
    {
      name: 'Solana Testnet',
      cluster: 'testnet',
      nativeCurrency: {
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9
      },
      rpc: [
        'https://api.testnet.solana.com',
        clusterApiUrl('testnet')
      ]
    }
  ];

  private connectionCache: Map<string, Connection> = new Map();

  private constructor() {}

  static getInstance(): ChainManager {
    if (!ChainManager.instance) {
      ChainManager.instance = new ChainManager();
    }
    return ChainManager.instance;
  }

  async getNetwork(cluster: string): Promise<Network | undefined> {
    return this.networks.find(network => network.cluster === cluster);
  }

  async getConnection(cluster: string): Promise<Connection> {
    // Check cache first
    const cachedConnection = this.connectionCache.get(cluster);
    if (cachedConnection) {
      return cachedConnection;
    }

    const network = await this.getNetwork(cluster);
    if (!network) throw new Error(`Network ${cluster} not found`);
    if (!network.rpc || network.rpc.length === 0) throw new Error(`No RPC endpoints found for network ${cluster}`);

    const errors: Error[] = [];
    for (const rpc of network.rpc) {
      try {
        console.log(`Trying RPC: ${rpc}`);
        const connection = new Connection(rpc, {
          commitment: 'confirmed',
          disableRetryOnRateLimit: true
        });
        
        // Test the connection
        await connection.getSlot();
        console.log(`Successfully connected to RPC: ${rpc}`);
        
        // Cache the successful connection
        this.connectionCache.set(cluster, connection);
        
        return connection;
      } catch (error) {
        console.warn(`RPC ${rpc} failed:`, error);
        errors.push(error as Error);
        continue;
      }
    }
    
    throw new Error(`All RPCs failed for network ${cluster}. Errors: ${errors.map(e => e.message).join(', ')}`);
  }

  // Helper method to clear connection cache if needed
  clearConnectionCache() {
    this.connectionCache.clear();
  }
}