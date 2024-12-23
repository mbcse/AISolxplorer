'use client';
import React, { useEffect, useRef } from 'react';
import { useChat } from 'ai/react';
import { Search, Loader2, XCircle, RefreshCw, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import { formatAssistantMessage } from '../utils/messageFormatter';
import { formatAddress } from '../utils/formatUtils';
import mermaid from 'mermaid';

const BlockchainExplorer = () => {
  const messagesEndRef = useRef(null);
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, reload, stop } = useChat();

  console.log(messages);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const latestAssistantMessage = messages
    .filter(m => m.role === 'assistant' && m.content.length > 0)
    .pop();

  useEffect(() => {
    if (latestAssistantMessage?.content) {
      // Check if the content includes Mermaid diagram
      if (latestAssistantMessage.content.includes('graph TD;')) {
        mermaid.run();
      }
    }
  }, [latestAssistantMessage]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">AIXplorer Blockchain Explorer</h1>
            <p className="text-sm text-gray-500">AI-powered transaction analysis</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        {/* Left Panel - Transaction History */}
        <div className="w-1/3 p-6 overflow-y-auto border-r">
          <div className="space-y-4">
            {messages.filter(m => m.role === 'user').map((message, index) => (
              <div key={message.id} 
                className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    👤
                  </div>
                  <span className="font-medium text-gray-700">Transaction Query #{messages.filter(m => m.role === 'user').length - index}</span>
                </div>
                <div className="text-gray-700 ml-11 break-words">
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Analysis Results */}
        <div className="w-2/3 p-6 overflow-y-auto bg-gray-50">
          {!latestAssistantMessage ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center p-8 max-w-md">
                <div className="w-16 h-16 mx-auto bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mb-6">
                  <Search className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                  Start Exploring
                </h2>
                <p className="text-gray-600">
                  Enter a transaction hash below to get detailed insights and analysis
                </p>
              </div>
            </div>
          ) : (
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: formatAssistantMessage(latestAssistantMessage.content)
              }} 
            />
          )}
          
          {isLoading && (
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-4 mt-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white">
                  🤖
                </div>
                <div className="flex-1 flex items-center gap-4">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                  <span className="text-gray-600">Analyzing transaction...</span>
                </div>
                <button 
                  onClick={stop}
                  className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Stop</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer with Input */}
      <div className="border-t bg-white p-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Enter transaction hash (e.g., analyze 0x123... on ethereum)"
              disabled={isLoading}
              // Add more right padding to prevent text going behind button
              className="w-full pl-12 pr-44 py-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm hover:shadow-md transition-all duration-300"
            />
            <div className="absolute inset-y-0 right-2 flex items-center">
              <button 
                type="submit" 
                disabled={isLoading || !input}
                className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Analyze</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
          {error && (
            <div className="mt-4 flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-red-700">Analysis failed. Please try again.</span>
              </div>
              <button 
                onClick={reload}
                className="px-4 py-2 bg-white text-red-500 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2 border border-red-200"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockchainExplorer;