import { 
    ParsedTransactionWithMeta,
    ParsedInstruction,
    PartiallyDecodedInstruction,
    PublicKey,
    Connection
  } from '@solana/web3.js';
  import { TokenMetadataManager } from './tokensMetadataManager';
  import { TRANSFERS } from '../types';
  
  type INSTRUCTION_TYPE = ParsedInstruction | PartiallyDecodedInstruction;
  
  interface ExtractedData {
    programInteractions: string[];
    actions: any[];
    otherInstructions: any[];
    types: string[];
    transfers: TRANSFERS[];
  }
  
  // Known program IDs
  const KNOWN_PROGRAMS = {
    TOKEN_PROGRAM: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    ASSOCIATED_TOKEN: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    SYSTEM_PROGRAM: '11111111111111111111111111111111',
    METADATA_PROGRAM: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
  };
  
  async function parseTokenTransfer(
    instruction: ParsedInstruction,
    connection: Connection
  ): Promise<TRANSFERS | null> {
    const metadataManager = TokenMetadataManager.getInstance();
    
    if (instruction.parsed.type === 'transferChecked' || instruction.parsed.type === 'transfer') {
      const tokenMetadata = await metadataManager.getTokenMetadata(
        connection,
        instruction.parsed.info.mint || instruction.parsed.info.token
      );
  
      return {
        tokenType: 'SPL',
        token: tokenMetadata,
        from: instruction.parsed.info.authority || instruction.parsed.info.source,
        to: instruction.parsed.info.destination,
        value: (instruction.parsed.info.tokenAmount?.uiAmount || 
                instruction.parsed.info.amount / Math.pow(10, tokenMetadata.decimals || 9)).toString()
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
  
  async function getInstructionType(
    instruction: INSTRUCTION_TYPE,
    programId: string
  ): Promise<string> {
    if ('parsed' in instruction) {
      return instruction.program + ':' + instruction.parsed.type;
    }
  
    // Handle known programs
    switch (programId) {
      case KNOWN_PROGRAMS.TOKEN_PROGRAM:
        return 'spl-token';
      case KNOWN_PROGRAMS.ASSOCIATED_TOKEN:
        return 'associated-token';
      case KNOWN_PROGRAMS.METADATA_PROGRAM:
        return 'metadata';
      default:
        return 'unknown';
    }
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
    for (const instruction of tx.transaction.message.instructions) {
      console.log("Instrution: ", instruction)
      // Track program interactions
      const programId = 'programId' in instruction ? 
        instruction.programId.toString() : 
        instruction.program;
        
      if (!result.programInteractions.includes(programId)) {
        result.programInteractions.push(programId);
      }
  
      // Process based on program
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
  
          default:
            const type = await getInstructionType(instruction, programId);
            result.types.push(type);
            result.actions.push({
              program: instruction.program,
              type: instruction.parsed.type,
              info: instruction.parsed.info
            });
        }
      } else {
        // Handle partially decoded instructions
        result.otherInstructions.push({
          programId,
          accounts: instruction.accounts.map(acc => acc.toString()),
          data: instruction.data
        });
      }
    }
  
    console.timeEnd('InstructionProcessor');
    return result;
  }