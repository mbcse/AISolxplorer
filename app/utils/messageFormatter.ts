// utils/messageFormatter.ts
import { extractComplexityBadge, extractRiskBadge } from './formatUtils';


const formatProgramInteractions = (content: string): string => {
  if (!content) return '';
  
  // Split content into groups (each program interaction is a group of related lines)
  const interactions = content.split('\n\n').map(group => group.trim()).filter(group => group);
  
  return interactions.map(interaction => {
    const lines = interaction.split('\n')
      .map(line => line.trim())
      .filter(line => line);
    
    return `
      <div class="bg-white/90 border border-yellow-200 p-4 mb-3 rounded-lg hover:shadow-md transition-all duration-300">
        ${lines.map(line => {
          const [key, value] = line.split(':').map(part => part.trim());
          if (!value) {
            return `<div class="text-gray-700 py-1">${key}</div>`;
          }
          return `
            <div class="flex items-start py-1.5 border-b border-gray-100 last:border-0">
              <span class="text-gray-500 font-medium min-w-[100px]">${key}:</span>
              <span class="text-gray-700 ml-2">${value}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }).join('');
};


export const formatList = (content: string): string => {
  if (!content) return '';
  return content.split('\n')
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .map(item => {
      const formattedItem = item.replace(/^-\s*/, '');
      if (formattedItem.toLowerCase().includes('warning')) {
        return `<div class="bg-red-50 text-red-700 p-4 rounded-xl my-2 border-l-4 border-red-500 hover:shadow-lg transition-all duration-300">${formattedItem}</div>`;
      }
      if (formattedItem.toLowerCase().includes('success')) {
        return `<div class="bg-green-50 text-green-700 p-4 rounded-xl my-2 border-l-4 border-green-500 hover:shadow-lg transition-all duration-300">${formattedItem}</div>`;
      }
      return `<div class="text-gray-700 p-3 rounded-xl my-2 hover:bg-gray-50 transition-all duration-300">${formattedItem}</div>`;
    })
    .join('');
};

const formatTokenTransfers = (content: string): string => {
  if (!content) return '';
  
  // Split content into groups (each token transfer is a group of related lines)
  const transfers = content.split('\n\n').map(group => group.trim()).filter(group => group);
  
  return transfers.map(transfer => {
    const lines = transfer.split('\n')
      .map(line => line.trim())
      .filter(line => line);
    
    return `
      <div class="bg-white/90 border border-green-200 p-4 mb-3 rounded-lg hover:shadow-md transition-all duration-300">
        ${lines.map(line => {
          const [key, value] = line.split(':').map(part => part.trim());
          if (!value) {
            return `<div class="text-gray-700 py-1">${key}</div>`;
          }
          return `
            <div class="flex items-start py-1.5 border-b border-gray-100 last:border-0">
              <span class="text-gray-500 font-medium min-w-[100px]">${key}:</span>
              <span class="text-gray-700 ml-2">${value}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }).join('');
};

export const formatTransferSection = (content: string): string => {
  if (!content) return '<div class="text-gray-500 text-center italic p-4">No transfers detected</div>';
  
  const parts = content.split('---Sub Section---');
  let html = '';
  
  parts.forEach(part => {
    const trimmedPart = part.trim();
    
    if (trimmedPart.includes('Native SOL:')) {
      html += `<div class="bg-gradient-to-r from-purple-50 to-purple-100/50 backdrop-blur-sm border-l-4 border-purple-500 p-4 mb-4 rounded-xl hover:shadow-lg transition-all duration-300">
        <h4 class="flex items-center text-base font-medium text-gray-900 mb-3">
          <span class="mr-2">💎</span>
          <span>Native SOL Transfer</span>
        </h4>
        ${formatList(trimmedPart.replace('Native SOL:', '').trim())}
      </div>`;
    }
    else if (trimmedPart.includes('Token Transfers (SPL):')) {
      html += `<div class="bg-gradient-to-r from-green-50 to-green-100/50 backdrop-blur-sm border-l-4 border-green-500 p-4 mb-4 rounded-xl hover:shadow-lg transition-all duration-300">
        <h4 class="flex items-center text-base font-medium text-gray-900 mb-3">
          <span class="mr-2">🪙</span>
          <span>SPL Token Transfers</span>
        </h4>
        ${formatTokenTransfers(trimmedPart.replace('Token Transfers (SPL):', '').trim())}
      </div>`;
    }
    else if (trimmedPart.includes('NFT Transfers:')) {
      html += `<div class="bg-gradient-to-r from-pink-50 to-pink-100/50 backdrop-blur-sm border-l-4 border-pink-500 p-4 mb-4 rounded-xl hover:shadow-lg transition-all duration-300">
        <h4 class="flex items-center text-base font-medium text-gray-900 mb-3">
          <span class="mr-2">🖼️</span>
          <span>NFT Transfers</span>
        </h4>
        ${formatTokenTransfers(trimmedPart.replace('NFT Transfers:', '').trim())}
      </div>`;
    }
  });
  
  return html || '<div class="text-gray-500 text-center italic p-4">No transfers detected</div>';
};

export const formatAssistantMessage = (content: string): string => {
  if (!content) return '';
  
  const sections = content.split('---Section---');
  let formattedContent = '';
  
  sections.forEach(section => {
    const trimmedSection = section.trim();
    
    if (trimmedSection.includes('TRANSACTION OVERVIEW:')) {
      formattedContent += `<div class="bg-white/80 backdrop-blur-sm border border-indigo-100 rounded-2xl p-6 mb-4 hover:shadow-xl transition-all duration-300">
        <h3 class="flex items-center text-lg font-semibold text-gray-900 mb-4">
          <span class="mr-3 bg-indigo-100 p-2 rounded-xl">🔍</span>
          <span>Transaction Overview</span>
          ${extractComplexityBadge(trimmedSection)}
        </h3>
        ${formatList(trimmedSection.replace('TRANSACTION OVERVIEW:', '').trim())}
      </div>`;
    }
    else if (trimmedSection.includes('NETWORK DETAILS:')) {
      formattedContent += `<div class="bg-white/80 backdrop-blur-sm border border-blue-100 rounded-2xl p-6 mb-4 hover:shadow-xl transition-all duration-300">
        <h3 class="flex items-center text-lg font-semibold text-gray-900 mb-4">
          <span class="mr-3 bg-blue-100 p-2 rounded-xl">🌐</span>
          <span>Network Details</span>
        </h3>
        ${formatList(trimmedSection.replace('NETWORK DETAILS:', '').trim())}
      </div>`;
    }
    else if (trimmedSection.includes('TRANSFER ANALYSIS:')) {
      formattedContent += `<div class="bg-white/80 backdrop-blur-sm border border-purple-100 rounded-2xl p-6 mb-4 hover:shadow-xl transition-all duration-300">
        <h3 class="flex items-center text-lg font-semibold text-gray-900 mb-4">
          <span class="mr-3 bg-purple-100 p-2 rounded-xl">↔️</span>
          <span>Transfer Analysis</span>
        </h3>
        ${formatTransferSection(trimmedSection.replace('TRANSFER ANALYSIS:', '').trim())}
      </div>`;
    }
    else if (trimmedSection.includes('DEX INTERACTIONS:')) {
      formattedContent += `<div class="bg-white/80 backdrop-blur-sm border border-orange-100 rounded-2xl p-6 mb-4 hover:shadow-xl transition-all duration-300">
        <h3 class="flex items-center text-lg font-semibold text-gray-900 mb-4">
          <span class="mr-3 bg-orange-100 p-2 rounded-xl">🔄</span>
          <span>DEX Interactions</span>
        </h3>
        ${formatList(trimmedSection.replace('DEX INTERACTIONS:', '').trim())}
      </div>`;
    }
    else if (trimmedSection.includes('PROGRAM INTERACTIONS:')) {
      formattedContent += `<div class="bg-white/80 backdrop-blur-sm border border-yellow-100 rounded-2xl p-6 mb-4 hover:shadow-xl transition-all duration-300">
        <h3 class="flex items-center text-lg font-semibold text-gray-900 mb-4">
          <span class="mr-3 bg-yellow-100 p-2 rounded-xl">📝</span>
          <span>Program Interactions</span>
        </h3>
        ${formatProgramInteractions(trimmedSection.replace('PROGRAM INTERACTIONS:', '').trim())}
      </div>`;
    }
    else if (trimmedSection.includes('COST ANALYSIS:')) {
      formattedContent += `<div class="bg-white/80 backdrop-blur-sm border border-green-100 rounded-2xl p-6 mb-4 hover:shadow-xl transition-all duration-300">
        <h3 class="flex items-center text-lg font-semibold text-gray-900 mb-4">
          <span class="mr-3 bg-green-100 p-2 rounded-xl">⚡</span>
          <span>Cost Analysis</span>
        </h3>
        ${formatList(trimmedSection.replace('COST ANALYSIS:', '').trim())}
      </div>`;
    }
    else if (trimmedSection.includes('SECURITY ASSESSMENT:')) {
      formattedContent += `<div class="bg-white/80 backdrop-blur-sm border border-red-100 rounded-2xl p-6 mb-4 hover:shadow-xl transition-all duration-300">
        <h3 class="flex items-center text-lg font-semibold text-gray-900 mb-4">
          <span class="mr-3 bg-red-100 p-2 rounded-xl">🛡️</span>
          <span>Security Assessment</span>
          ${extractRiskBadge(trimmedSection)}
        </h3>
        ${formatList(trimmedSection.replace('SECURITY ASSESSMENT:', '').trim())}
      </div>`;
    }
    else if (trimmedSection.includes('ADDITIONAL INSIGHTS:')) {
      formattedContent += `<div class="bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl p-6 mb-4 hover:shadow-xl transition-all duration-300">
        <h3 class="flex items-center text-lg font-semibold text-gray-900 mb-4">
          <span class="mr-3 bg-gray-100 p-2 rounded-xl">💡</span>
          <span>Additional Insights</span>
        </h3>
        ${formatList(trimmedSection.replace('ADDITIONAL INSIGHTS:', '').trim())}
      </div>`;
    }
    else if (trimmedSection.includes('graph TD;') || trimmedSection.includes('graph LR;') || trimmedSection.includes('sequenceDiagram')) {
      formattedContent += `<div class="mermaid">${trimmedSection}</div>`;
    }
  });
  
  return formattedContent || `<div class="text-gray-700 whitespace-pre-wrap">${content}</div>`;
};