import { 
  ParsedTransactionWithMeta,
  ParsedInstruction,
  PartiallyDecodedInstruction,
  PublicKey,
  Connection
} from '@solana/web3.js';
import { TokenMetadataManager } from './tokensMetadataManager';
import { TRANSFERS } from '../types';
import bs58 from 'bs58';

type INSTRUCTION_TYPE = ParsedInstruction | PartiallyDecodedInstruction;

interface ExtractedData {
  programInteractions: string[];
  actions: any[];
  otherInstructions: any[];
  types: string[];
  transfers: TRANSFERS[];
}

interface InstructionDetail {
  programName: string;
  instructionName: string;
  params: Record<string, any>;
  innerInstructions?: InstructionDetail[];
}

// Expanded known program IDs with names
const KNOWN_PROGRAMS = {
  // Core Programs
  SYSTEM_PROGRAM: {
    id: '11111111111111111111111111111111',
    name: 'System Program',
    instructions: {
      'transfer': 'Transfer SOL',
      'transferWithSeed': 'Transfer SOL with Seed',
      'allocate': 'Allocate Space',
      'allocateWithSeed': 'Allocate Space with Seed',
      'assign': 'Assign Account',
      'assignWithSeed': 'Assign Account with Seed',
      'createAccount': 'Create Account',
      'createAccountWithSeed': 'Create Account with Seed',
      'advance_nonce_account': 'Advance Nonce Account',
      'withdraw_nonce_account': 'Withdraw from Nonce Account',
      'initialize_nonce_account': 'Initialize Nonce Account',
      'authorize_nonce_account': 'Authorize Nonce Account'
    }
  },
  TOKEN_PROGRAM: {
    id: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    name: 'Token Program',
    instructions: {
      'transfer': 'Transfer Tokens',
      'transferChecked': 'Transfer Tokens (Checked)',
      'mintTo': 'Mint Tokens',
      'mintToChecked': 'Mint Tokens (Checked)',
      'burn': 'Burn Tokens',
      'burnChecked': 'Burn Tokens (Checked)',
      'approve': 'Approve Token Delegation',
      'revoke': 'Revoke Token Delegation',
      'setAuthority': 'Set Authority',
      'closeAccount': 'Close Token Account',
      'freezeAccount': 'Freeze Account',
      'thawAccount': 'Thaw Account',
      'syncNative': 'Sync Native',
      'initializeMint': 'Initialize Mint',
      'initializeAccount': 'Initialize Token Account'
    }
  },
  ASSOCIATED_TOKEN: {
    id: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    name: 'Associated Token Program',
    instructions: {
      'create': 'Create Associated Token Account',
      'createIdempotent': 'Create Associated Token Account (Idempotent)',
      'recover': 'Recover Nested Token Account'
    }
  },
  METADATA_PROGRAM: {
    id: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
    name: 'Token Metadata Program',
    instructions: {
      'createMetadataAccount': 'Create Metadata Account',
      'updateMetadataAccount': 'Update Metadata Account',
      'createMasterEdition': 'Create Master Edition',
      'verifyCollection': 'Verify Collection',
      'setAndVerifyCollection': 'Set and Verify Collection',
      'unverifyCollection': 'Unverify Collection',
      'burnNft': 'Burn NFT',
      'verifyCreator': 'Verify Creator',
      'unverifyCreator': 'Unverify Creator'
    }
  },
  // Popular DEX Programs
  JUPITER: {
    id: 'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB',
    name: 'Jupiter Aggregator v6',
    instructions: {
      default: 'Swap Tokens'
    }
  },
  RAYDIUM_V4: {
    id: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
    name: 'Raydium Liquidity Pool V4',
    instructions: {
      default: 'Swap Tokens'
    }
  },
  ORCA_WHIRLPOOL: {
    id: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
    name: 'Orca Whirlpool',
    instructions: {
      default: 'Swap Tokens'
    }
  },
  // Other Popular Programs
  STAKE_PROGRAM: {
    id: 'Stake11111111111111111111111111111111111111',
    name: 'Stake Program',
    instructions: {
      'initialize': 'Initialize Stake Account',
      'delegate': 'Delegate Stake',
      'withdraw': 'Withdraw Stake',
      'deactivate': 'Deactivate Stake',
      'split': 'Split Stake',
      'merge': 'Merge Stake',
      'authorizeWithSeed': 'Authorize with Seed'
    }
  },
  MARINADE: {
    id: 'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD',
    name: 'Marinade.Finance',
    instructions: {
      default: 'Stake SOL'
    }
  },
  SERUM_V3: {
    id: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
    name: 'Serum DEX v3',
    instructions: {
      default: 'DEX Operation'
    }
  },
  COMPUTE_BUDGET: {
    id: 'ComputeBudget111111111111111111111111111111',
    name: 'Compute Budget Program',
    instructions: {
      default: 'Set Compute Unit Limit'
    }
  },
  MAGIC_EDEN_V2: {
    id: 'M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K',
    name: 'Magic Eden v2',
    instructions: {
      default: 'Magic Eden Operation'
    }
  },
  TOKEN_AUTH_RULES: {
    id: 'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg',
    name: 'Token Auth Rules',
    instructions: {
      default: 'Token Authorization Rules'
    }
  },
  MEMO_PROGRAM: {
    id: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
    name: 'Memo Program',
    instructions: {
      default: 'Add Memo'
    }
  },
};

async function parseTokenTransfer(
  instruction: ParsedInstruction,
  connection: Connection
): Promise<TRANSFERS | null> {
  const metadataManager = TokenMetadataManager.getInstance();
  
  if (instruction.parsed.type === 'transferChecked' || instruction.parsed.type === 'transfer') {
    const mintAddress = instruction.parsed.info.mint || instruction.parsed.info.token;
    
    // Get token metadata
    const tokenMetadata = await metadataManager.getTokenMetadata(connection, mintAddress);

    // Parse transfer details
    let value = '0';
    if (instruction.parsed.info.tokenAmount) {
      value = instruction.parsed.info.tokenAmount.uiAmount.toString();
    } else if (instruction.parsed.info.amount) {
      value = (instruction.parsed.info.amount / Math.pow(10, tokenMetadata.decimals || 9)).toString();
    }

    return {
      tokenType: 'SPL',
      token: tokenMetadata,
      from: instruction.parsed.info.authority || instruction.parsed.info.source,
      to: instruction.parsed.info.destination,
      value
    };
  }

  return null;
}

async function parseNFTTransfer(
  instruction: ParsedInstruction,
  connection: Connection
): Promise<TRANSFERS | null> {
  const metadataManager = TokenMetadataManager.getInstance();

  if (instruction.parsed.type === 'transferChecked' || instruction.parsed.type === 'transfer') {
    // Check if this is an NFT by looking at decimals and amount
    if (instruction.parsed.info.tokenAmount?.decimals === 0 && 
        instruction.parsed.info.tokenAmount?.uiAmount === 1) {
      
      const tokenMetadata = await metadataManager.getTokenMetadata(
        connection,
        instruction.parsed.info.mint,
        'NFT'
      );

      return {
        tokenType: 'NFT',
        token: tokenMetadata,
        from: instruction.parsed.info.authority || instruction.parsed.info.source,
        to: instruction.parsed.info.destination,
        tokenId: instruction.parsed.info.mint // In Solana, mint address is the token ID
      };
    }
  }

  return null;
}

async function parseSystemInstruction(
  instruction: ParsedInstruction
): Promise<TRANSFERS | null> {
  if (instruction.parsed.type === 'transfer' || instruction.parsed.type === 'transferWithSeed') {
    return {
      tokenType: 'Native',
      token: {
        symbol: 'SOL',
        decimals: 9
      },
      from: instruction.parsed.info.source || instruction.parsed.info.from,
      to: instruction.parsed.info.destination || instruction.parsed.info.to,
      value: (instruction.parsed.info.lamports / 1e9).toString()
    };
  }

  return null;
}

const PROGRAM_ID_MAP = new Map(
  Object.values(KNOWN_PROGRAMS).map(program => [program.id, program])
);

function getProgramInfo(programId: PublicKey | string): any {
  let programAddress: string;

  if (programId instanceof PublicKey) {
    programAddress = programId.toBase58();
  } else {
    programAddress = programId;
  }

  return PROGRAM_ID_MAP.get(programAddress) || {
    name: `Unknown Program (${programAddress})`,
    instructions: { default: 'Unknown Instruction' }
  };
}

function decodeInstructionData(data: string): string {
  try {
    // Try to decode base58 data
    return bs58.decode(data).toString('utf8');
  } catch (e) {
    return data;
  }
}

function findKnownProgram(programId: string) {
  return Object.values(KNOWN_PROGRAMS).find(program => program.id === programId);
}

function getInstructionName(program: typeof KNOWN_PROGRAMS[keyof typeof KNOWN_PROGRAMS], type: string): string {
  return program.instructions[type] || type || 'Unknown Instruction';
}

async function parseInstructionDetail(
  instruction: INSTRUCTION_TYPE,
  innerInstructions: InstructionDetail[] = []
): Promise<InstructionDetail> {
  let programInfo;
  let instructionName: string;
  let params: Record<string, any> = {};

  if ('parsed' in instruction) {
    // Handle parsed instructions
    programInfo = getProgramInfo(instruction.programId);
    instructionName = instruction.parsed.type;
    params = instruction.parsed.info || {};
  } else {
    // Handle partially decoded instructions
    const programId = instruction.programId;
    programInfo = getProgramInfo(programId);
    
    // Try to decode instruction data
    const decodedData = decodeInstructionData(instruction.data);
    
    params = {
      data: decodedData,
      accounts: instruction.accounts.map(acc => {
        if (acc instanceof PublicKey) {
          return acc.toBase58();
        }
        return acc.toString();
      })
    };

    instructionName = programInfo.instructions.default || 'Unknown Instruction';
  }

  return {
    programName: programInfo.name,
    instructionName: programInfo.instructions[instructionName] || instructionName,
    params,
    innerInstructions
  };
}

export async function classifyAndExtractInstructions(
  tx: ParsedTransactionWithMeta,
  connection: Connection
): Promise<ExtractedData> {
  console.time('InstructionProcessor');

  const result: ExtractedData = {
    programInteractions: [],
    actions: [],
    otherInstructions: [],
    types: [],
    transfers: []
  };

  // Process all instructions
  for (let idx = 0; idx < tx.transaction.message.instructions.length; idx++) {
    const instruction = tx.transaction.message.instructions[idx];
    // console.log("Processing instruction:", instruction);
    
    // Track program interactions using base58 encoded addresses
    const programId = instruction.programId instanceof PublicKey ? 
      instruction.programId.toBase58() : 
      'program' in instruction ? instruction.program : instruction.programId.toString();
      
    if (!result.programInteractions.includes(programId)) {
      result.programInteractions.push(programId);
    }

    // Get inner instructions
    const innerInstructions = tx.meta?.innerInstructions
      ?.filter(inner => inner.index === idx)
      .map(inner => inner.instructions)
      .flat()
      .map(async (innerIx) => await parseInstructionDetail(innerIx as any)) || [];

    // Parse main instruction
    const instructionDetail = await parseInstructionDetail(
      instruction,
      await Promise.all(innerInstructions)
    );

    // Process special cases (transfers, etc.)
    if ('parsed' in instruction) {
      switch (instruction.program) {
        case 'system':
          const systemTransfer = await parseSystemInstruction(instruction);
          if (systemTransfer) {
            result.transfers.push(systemTransfer);
            result.types.push('Native Transfer');
          }
          break;

        case 'spl-token':
          const tokenTransfer = await parseTokenTransfer(instruction, connection);
          if (tokenTransfer) {
            result.transfers.push(tokenTransfer);
            result.types.push('Token Transfer');
          }
          
          const nftTransfer = await parseNFTTransfer(instruction, connection);
          if (nftTransfer) {
            result.transfers.push(nftTransfer);
            result.types.push('NFT Transfer');
          }
          break;
      }
      
      result.types.push(instructionDetail.instructionName);
      result.actions.push(instructionDetail);
    } else {
      const programInfo = getProgramInfo(programId);
      result.types.push(programInfo.name);
      result.otherInstructions.push(instructionDetail);
    }
  }

  console.timeEnd('InstructionProcessor');
  console.log(result);
  return result;
}