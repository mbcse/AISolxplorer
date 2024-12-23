import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { systemPrompt } from './systemPrompt';
import { serializeBigInts } from './helpers';
import { ChainManager } from './helpers/chainManager';
import { TokenMetadataManager } from './helpers/tokensMetadataManager';
import { TRANSFERS } from './types';
import { classifyAndExtractInstructions } from './helpers/instructionProcessor';

// Transaction analysis
async function analyzeTransaction(txSignature: string, cluster: string) {
  console.log(`Analyzing transaction: ${txSignature} on cluster: ${cluster}`);
  const chainManager = ChainManager.getInstance();

  try {
    const [connection, network] = await Promise.all([
      chainManager.getConnection(cluster),
      chainManager.getNetwork(cluster)
    ]);
    
    if (!network) throw new Error(`Network ${cluster} not found`);

    const tx = await connection.getParsedTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
    });
    
    if (!tx) throw new Error('Transaction not found');

    const block = await connection.getBlock(tx.slot, { maxSupportedTransactionVersion: 0 });
    if (!block) throw new Error('Block not found');

    const analysis = {
      network: {
        name: network.name,
        cluster: cluster,
        currency: 'SOL',
        slot: tx.slot,
        blockTime: block.blockTime ? new Date(block.blockTime * 1000).toISOString() : 'unknown'
      },
      transaction: {
        signature: txSignature,
        feePayer: tx.transaction.message.accountKeys[0].pubkey.toString(),
        recentBlockhash: tx.transaction.message.recentBlockhash,
        status: tx.meta?.err ? 'Failed' : 'Success',
        fee: tx.meta?.fee ? (tx.meta.fee / 1e9).toString() : 'unknown',
        computeUnits: tx.meta?.computeUnitsConsumed?.toString() || 'unknown',
      },
      actionTypes: [] as string[],
      transfers: [] as TRANSFERS[],
      actions: [] as any[],
      interactions: [] as string[],
      securityInfo: [] as any[],
      otherInstructions: [] as any[],
      summary: {} as any
    };

    // SOL transfer check
    if (tx.meta?.preBalances && tx.meta?.postBalances) {
      const accountKeys = tx.transaction.message.accountKeys;
      for (let i = 0; i < accountKeys.length; i++) {
        const preBalance = tx.meta.preBalances[i];
        const postBalance = tx.meta.postBalances[i];
        const balanceDiff = postBalance - preBalance;
        
        if (Math.abs(balanceDiff) > 0 && i !== 0) { // Exclude fee payer
          analysis.actionTypes.push('Native Transfer');
          analysis.transfers.push({
            tokenType: 'Native',
            token: {
              symbol: 'SOL',
              decimals: 9
            },
            from: balanceDiff < 0 ? accountKeys[i].pubkey.toString() : '',
            to: balanceDiff > 0 ? accountKeys[i].pubkey.toString() : '',
            value: Math.abs(balanceDiff / 1e9).toString()
          });
        }
      }
    }

    // Extract and classify instructions
    if (tx.transaction.message.instructions.length > 0) {
      const extractedInstructions = await classifyAndExtractInstructions(
        tx as ParsedTransactionWithMeta,
        connection
      );

      // Add instructions to analysis
      analysis.actionTypes = [...analysis.actionTypes, ...extractedInstructions.types];
      analysis.transfers = [...analysis.transfers, ...extractedInstructions.transfers];
      analysis.actions = [...analysis.actions, ...extractedInstructions.actions];
      analysis.interactions = [...analysis.interactions, ...extractedInstructions.programInteractions];
      analysis.otherInstructions = [...analysis.otherInstructions, ...extractedInstructions.otherInstructions];
    }

    // Program deployment check
    const deployedProgram = tx.transaction.message.instructions.find(
      ix => ix.programId.equals(new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111'))
    );
    if (deployedProgram) {
      analysis.actionTypes.push("Program Deployment");
    }

    // Calculate average compute units for recent transactions
    try {
      const recentTxs = await connection.getSignaturesForAddress(
        new PublicKey(analysis.transaction.feePayer),
        { limit: 5 }
      );
      
      const recentTxDetails = await Promise.all(
        recentTxs.map(sig => connection.getParsedTransaction(sig.signature, {maxSupportedTransactionVersion: 0}))
      );
      
      const avgComputeUnits = recentTxDetails.reduce((sum, tx) => {
        return sum + (tx?.meta?.computeUnitsConsumed || 0);
      }, 0) / recentTxDetails.length;
      
      analysis.network.averageComputeUnits = avgComputeUnits.toString();
    } catch (error) {
      console.warn('Error getting average compute units:', error);
    }

    // Check program verification status
    try {
      const verificationPromises = analysis.interactions.map(async (address: string) => {
        try {
          const programInfo = await connection.getAccountInfo(new PublicKey(address));
          if (!programInfo?.executable) {
            return {
              type: 'Warning',
              message: `Address ${address} is not an executable program`
            };
          }
        } catch (error) {
          console.warn(`Error checking program at ${address}:`, error);
        }
        return null;
      });

      const verificationResults = await Promise.all(verificationPromises);
      analysis.securityInfo.push(...verificationResults.filter(result => result !== null));
    } catch (error) {
      console.warn('Error checking program verification:', error);
    }

    // Add complexity and risk analysis
    analysis.summary = {
      totalTransfers: analysis.transfers.length,
      uniqueTokens: new Set(analysis.transfers.map(t => t.token.address)).size,
      uniquePrograms: analysis.interactions.length,
      complexityScore: calculateComplexityScore(analysis),
      riskLevel: calculateRiskLevel(analysis),
    };

    return analysis;
  } catch (error) {
    console.error('Transaction analysis error:', error);
    throw error;
  }
}

// Helper function to calculate transaction complexity
function calculateComplexityScore(analysis: any): string {
  let score = 0;
  
  // Add points for different aspects of the transaction
  score += analysis.transfers.length * 2;
  score += analysis.interactions.length * 3;
  score += analysis.securityInfo.length * 2;
  score += analysis.actionTypes.length > 1 ? 5 : 0;
  
  // Convert score to category
  if (score <= 5) return 'Simple';
  if (score <= 15) return 'Moderate';
  if (score <= 30) return 'Complex';
  return 'Very Complex';
}

// Helper function to assess transaction risk level
function calculateRiskLevel(analysis: any): string {
  let riskFactors = 0;
  
  // Check various risk factors
  if (analysis.interactions.length > 3) riskFactors++;
  if (analysis.actionTypes.includes('Swap')) riskFactors++;
  if (analysis.securityInfo.some(e => e.type === 'Warning')) riskFactors += 2;
  if (analysis.transfers.length > 5) riskFactors++;
  if (analysis.actionTypes.length > 1) riskFactors++;
  
  // Convert risk factors to level
  if (riskFactors === 0) return 'Low';
  if (riskFactors <= 2) return 'Medium';
  return 'High';
}

// Create OpenAI instance
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? ''
});

// API Route handler
export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    const result = streamText({
      model: openai('gpt-4o-mini'),
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        ...messages
      ],
      tools: {
        analyzeTx: tool({
          description: 'Analyze a Solana blockchain transaction with detailed token and instruction parsing',
          parameters: z.object({
            txSignature: z.string().describe('The transaction signature to analyze'),
            cluster: z.string().describe('The Solana cluster (mainnet-beta, devnet, testnet)'),
          }),
          execute: async ({ txSignature, cluster }) => {
            try {
              const analysis = await analyzeTransaction(txSignature, cluster);
              const serializedAnalysis = serializeBigInts(analysis);
              return {
                success: true,
                data: JSON.stringify(serializedAnalysis),
              };
            } catch (error) {
              return {
                success: false,
                error: (error as Error).message,
              };
            }
          },
        }),
      },
      temperature: 0.7,
      maxSteps: 5,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export const runtime = 'edge';
export const maxDuration = 15;