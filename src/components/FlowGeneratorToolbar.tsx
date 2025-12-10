
import React, { useState } from 'react';
import useStore from '../../store/workflowStore';
import { Wand2, Loader2 } from 'lucide-react';
import type { Node } from 'reactflow';
import type { NodeData } from '../../types';

const FlowGeneratorToolbar: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { setNodes, setEdges } = useStore();

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setIsLoading(true);
        setError(null);
        try {
            const { nodes, edges } = await geminiService.generateFlow(prompt);
            setNodes(nodes as Node<NodeData>[]); // Cast to correct type
            setEdges(edges);
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 w-full max-w-2xl px-4">
             <div className="bg-white rounded-lg shadow-xl p-2 flex items-center gap-2 border border-gray-200">
                <Wand2 className="h-5 w-5 text-blue-500 ml-2" />
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    placeholder="Describe your flow idea for AI to generate..."
                    className="flex-grow bg-transparent focus:outline-none text-gray-700 px-2 py-1"
                    disabled={isLoading}
                />
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mr-2">
                    <span className="bg-gray-100 px-2 py-1 rounded">Basic</span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">Standard</span>
                    <span className="bg-gray-100 px-2 py-1 rounded">Complex</span>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="px-6 py-2 rounded-md text-white bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 transition flex items-center justify-center min-w-[100px]"
                >
                    {isLoading ? <Loader2 className="animate-spin h-5 w-5"/> : 'Generate'}
                </button>
             </div>
             {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
        </div>
    );
};

export default FlowGeneratorToolbar;
