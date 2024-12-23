// utils/formatUtils.ts

export const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  export const extractComplexityBadge = (content: string): string => {
    const complexityMatch = content.match(/complexity score: (Simple|Moderate|Complex|Very Complex)/i);
    if (!complexityMatch) return '';
    
    const complexity = complexityMatch[1].toLowerCase();
    const colorClass = {
      'simple': 'bg-green-100 text-green-800 border border-green-200',
      'moderate': 'bg-blue-100 text-blue-800 border border-blue-200',
      'complex': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      'very complex': 'bg-red-100 text-red-800 border border-red-200'
    }[complexity] || 'bg-gray-100 text-gray-800 border border-gray-200';
  
    return `<span class="ml-auto px-4 py-1.5 text-sm font-medium rounded-full ${colorClass}">${complexityMatch[1]}</span>`;
  };
  
  export const extractRiskBadge = (content: string): string => {
    const riskMatch = content.match(/risk level: (Low|Medium|High)/i);
    if (!riskMatch) return '';
    
    const risk = riskMatch[1].toLowerCase();
    const colorClass = {
      'low': 'bg-green-100 text-green-800 border border-green-200',
      'medium': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      'high': 'bg-red-100 text-red-800 border border-red-200'
    }[risk] || 'bg-gray-100 text-gray-800 border border-gray-200';
  
    return `<span class="ml-auto px-4 py-1.5 text-sm font-medium rounded-full ${colorClass}">${riskMatch[1]} Risk</span>`;
  };