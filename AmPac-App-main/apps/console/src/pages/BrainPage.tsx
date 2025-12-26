import { useState } from 'react';
import { Brain, FileText, Bot, BookOpen, Upload, Search, CheckCircle, Terminal } from 'lucide-react';
import { brainService } from '../services/brainService';
import type { ExtractionResult, KnowledgeResult } from '../services/brainService';

export default function BrainPage() {
    const [activeTab, setActiveTab] = useState<'idp' | 'agents' | 'knowledge'>('idp');

    // IDP State
    const [file, setFile] = useState<File | null>(null);
    const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
    const [processingIdp, setProcessingIdp] = useState(false);

    // Knowledge State
    const [query, setQuery] = useState('');
    const [answer, setAnswer] = useState<KnowledgeResult | null>(null);
    const [searching, setSearching] = useState(false);

    // Agent State
    const [agentLog, setAgentLog] = useState<string[]>([]);
    const [agentRunning, setAgentRunning] = useState(false);

    const handleExtract = async () => {
        if (!file) return;
        setProcessingIdp(true);
        try {
            const result = await brainService.extractDocument(file);
            setExtraction(result);
        } finally {
            setProcessingIdp(false);
        }
    };

    const handleQuery = async () => {
        if (!query) return;
        setSearching(true);
        try {
            const result = await brainService.queryKnowledge(query);
            setAnswer(result);
        } finally {
            setSearching(false);
        }
    };

    const runAgent = async () => {
        setAgentRunning(true);
        setAgentLog(prev => [...prev, `> Initializing 'Document Chaser' agent...`]);

        try {
            const wf = await brainService.triggerAgent('document_chaser', { loanId: 'loan_123' });
            setAgentLog(prev => [...prev, ...wf.logs]);

            // Simulate async updates
            setTimeout(() => setAgentLog(prev => [...prev, `> Scanning loan file loan_123...`]), 1500);
            setTimeout(() => setAgentLog(prev => [...prev, `> FOUND: Missing '2023 Tax Return'`]), 3000);
            setTimeout(() => setAgentLog(prev => [...prev, `> ACTION: Drafting email to borrower...`]), 4500);
            setTimeout(() => {
                setAgentLog(prev => [...prev, `> COMPLETED: Email drafted (ID: draft_555)`]);
                setAgentRunning(false);
            }, 6000);
        } catch (e) {
            setAgentRunning(false);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="bg-purple-100 p-3 rounded-full">
                    <Brain className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-text">AmPac Brain Console</h1>
                    <p className="text-textSecondary">Developer tools for AI capabilities</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border mb-6">
                <button
                    onClick={() => setActiveTab('idp')}
                    className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'idp' ? 'border-purple-600 text-purple-600' : 'border-transparent text-textSecondary hover:text-text'
                        }`}
                >
                    <FileText className="w-4 h-4" /> Document Intelligence
                </button>
                <button
                    onClick={() => setActiveTab('agents')}
                    className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'agents' ? 'border-purple-600 text-purple-600' : 'border-transparent text-textSecondary hover:text-text'
                        }`}
                >
                    <Bot className="w-4 h-4" /> Autonomous Agents
                </button>
                <button
                    onClick={() => setActiveTab('knowledge')}
                    className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'knowledge' ? 'border-purple-600 text-purple-600' : 'border-transparent text-textSecondary hover:text-text'
                        }`}
                >
                    <BookOpen className="w-4 h-4" /> Knowledge Graph
                </button>
            </div>

            {/* Content */}
            <div className="bg-surface rounded-lg border border-border min-h-[400px]">

                {/* IDP Tab */}
                {activeTab === 'idp' && (
                    <div className="p-6">
                        <div className="max-w-xl mx-auto text-center mb-8">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:bg-gray-50 transition-colors cursor-pointer">
                                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-4" />
                                <p className="text-text font-medium">Drop a Tax Return or Bank Statement</p>
                                <p className="text-xs text-textSecondary mt-1">PDF, JPG, PNG supported</p>
                                <input
                                    type="file"
                                    className="hidden"
                                    id="file-upload"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                />
                                <label htmlFor="file-upload" className="absolute inset-0 cursor-pointer" />
                            </div>
                            {file && (
                                <div className="mt-4 flex items-center justify-center gap-2">
                                    <span className="text-sm font-medium">{file.name}</span>
                                    <button
                                        onClick={handleExtract}
                                        disabled={processingIdp}
                                        className="bg-purple-600 text-white px-4 py-1.5 rounded text-sm hover:bg-purple-700 disabled:opacity-50"
                                    >
                                        {processingIdp ? 'Extracting...' : 'Run Extraction'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {extraction && (
                            <div className="bg-gray-50 rounded border border-border p-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-text flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-success" /> Extraction Results
                                    </h3>
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                        Confidence: {(extraction.confidence * 100).toFixed(0)}%
                                    </span>
                                </div>
                                <pre className="text-xs bg-white p-4 rounded border border-border overflow-auto max-h-60">
                                    {JSON.stringify(extraction.data, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                )}

                {/* Agents Tab */}
                {activeTab === 'agents' && (
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="col-span-1 space-y-4">
                                <div className="p-4 border border-border rounded-lg hover:border-purple-500 cursor-pointer transition-colors bg-white">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="bg-blue-100 p-2 rounded">
                                            <Bot className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="font-bold text-text">Document Chaser</div>
                                    </div>
                                    <p className="text-xs text-textSecondary">Scans loans for missing docs and emails borrowers.</p>
                                    <button
                                        onClick={runAgent}
                                        disabled={agentRunning}
                                        className="mt-3 w-full py-1.5 bg-gray-100 text-text text-xs font-medium rounded hover:bg-gray-200"
                                    >
                                        Trigger Workflow
                                    </button>
                                </div>

                                <div className="p-4 border border-border rounded-lg opacity-50 cursor-not-allowed bg-gray-50">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="bg-green-100 p-2 rounded">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div className="font-bold text-text">Compliance Bot</div>
                                    </div>
                                    <p className="text-xs text-textSecondary">Checks eligibility against SBA SOP.</p>
                                </div>
                            </div>

                            <div className="col-span-2 bg-black rounded-lg p-4 font-mono text-xs text-green-400 h-[400px] overflow-y-auto">
                                <div className="flex items-center gap-2 text-gray-500 mb-4 border-b border-gray-800 pb-2">
                                    <Terminal className="w-4 h-4" /> Agent Live Logs
                                </div>
                                {agentLog.length === 0 && <span className="text-gray-600">Waiting for agent trigger...</span>}
                                {agentLog.map((line, i) => (
                                    <div key={i} className="mb-1">{line}</div>
                                ))}
                                {agentRunning && <div className="animate-pulse">_</div>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Knowledge Tab */}
                {activeTab === 'knowledge' && (
                    <div className="p-6 max-w-2xl mx-auto">
                        <div className="relative mb-8">
                            <input
                                type="text"
                                placeholder="Ask a question about credit policy (e.g., 'Minimum DSCR for gas station')..."
                                className="w-full pl-4 pr-12 py-3 border border-border rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
                            />
                            <button
                                onClick={handleQuery}
                                disabled={searching}
                                className="absolute right-2 top-2 p-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                            >
                                <Search className="w-5 h-5" />
                            </button>
                        </div>

                        {answer && (
                            <div className="space-y-6">
                                <div className="bg-purple-50 p-6 rounded-lg border border-purple-100">
                                    <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                                        <Brain className="w-4 h-4" /> AI Answer
                                    </h3>
                                    <p className="text-purple-800 leading-relaxed">{answer.answer}</p>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-3">Citations</h4>
                                    <div className="space-y-3">
                                        {answer.citations.map((cite, i) => (
                                            <div key={i} className="bg-white p-3 rounded border border-border text-sm">
                                                <div className="flex justify-between mb-1">
                                                    <span className="font-bold text-text">{cite.source}</span>
                                                    <span className="text-xs text-textSecondary">{cite.section}</span>
                                                </div>
                                                <p className="text-textSecondary italic">"{cite.text}"</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
