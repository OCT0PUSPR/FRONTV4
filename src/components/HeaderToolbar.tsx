import React, { useEffect, useState } from 'react';
import { toPng as toPngImage } from 'html-to-image';
import { useReactFlow, getNodesBounds, getViewportForBounds } from 'reactflow';
import { Download, Share2, Eye, Menu, Save, Check } from 'lucide-react';
import useStore from '../../store/workflowStore';
import { API_CONFIG } from '../config/api';
import { useAuth } from '../../context/auth';
import { useParams } from 'react-router-dom';
import Toast from './Toast';

const HeaderToolbar: React.FC = () => {
    const [flowName, setFlowName] = useState('Untitled Flow');
    const [status, setStatus] = useState<'draft' | 'active' | 'archived'>('draft');
    const [toast, setToast] = useState<{ text: string; state: 'success' | 'error' } | null>(null);
    const { nodes, edges } = useStore();
    const { getNodes } = useReactFlow();
    const { uid } = useAuth();
    const params = useParams();
    const workflowId = params?.id as string | undefined;

    useEffect(() => {
        const loadMeta = async () => {
            try {
                if (!workflowId) return;
                const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/workflow/workflows/${workflowId}`);
                if (!res.ok) return;
                const json = await res.json().catch(() => ({}));
                const data = json?.data || {};
                if (data?.name) setFlowName(String(data.name));
                if (data?.status) setStatus(data.status as any);
            } catch {}
        };
        loadMeta();
    }, [workflowId]);

    const handleDownload = async () => {
        try {
            const viewportEl = document.querySelector('.react-flow__viewport') as HTMLElement | null;
            if (!viewportEl) throw new Error('Workflow canvas not found');

            const imageWidth = 1280;
            const imageHeight = 720;

            const nodesBounds = getNodesBounds(getNodes());
            const { x, y, zoom } = getViewportForBounds(nodesBounds, imageWidth, imageHeight, 0.5, 2);

            const dataUrl = await toPngImage(viewportEl, {
                backgroundColor: '#FFFFFF',
                width: imageWidth,
                height: imageHeight,
                style: {
                    width: `${imageWidth}px`,
                    height: `${imageHeight}px`,
                    transform: `translate(${x}px, ${y}px) scale(${zoom})`,
                },
            });
            const a = document.createElement('a');
            a.setAttribute('download', `${flowName.replace(/\s+/g, '_')}.png`);
            a.setAttribute('href', dataUrl);
            a.click();
        } catch (err: any) {
            setToast({ text: err?.message || 'Failed to export PNG', state: 'error' });
        }
    };

    const handleSave = async () => {
        try {
            const payload = {
                name: flowName || 'Untitled Workflow',
                description: '',
                category: 'correspondence',
                createdBy: Number(uid || localStorage.getItem('uid') || 0) || undefined,
                nodes: nodes.map((n) => ({
                    id: n.id,
                    type: n.type,
                    position: n.position,
                    data: n.data,
                })),
                edges: edges.map((e) => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    label: (e as any).label || null,
                })),
            };

            const token = localStorage.getItem('token');
            const isUpdate = Boolean(workflowId);
            const url = isUpdate
              ? `${API_CONFIG.BACKEND_BASE_URL}/workflow/workflows/${workflowId}`
              : `${API_CONFIG.BACKEND_BASE_URL}/workflow/workflows`;
            console.log('[Workflow] Saving to', url, 'method:', isUpdate ? 'PUT' : 'POST', 'payload:', payload);
            const res = await fetch(url, {
                method: isUpdate ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const contentType = res.headers.get('content-type') || '';
                const bodyText = contentType.includes('application/json')
                  ? JSON.stringify(await res.json().catch(() => ({})))
                  : await res.text().catch(() => '');
                console.error('[Workflow] Save failed', {
                  url,
                  status: res.status,
                  statusText: res.statusText,
                  headers: Object.fromEntries(res.headers.entries()),
                  body: bodyText,
                });
                throw new Error(`Failed to save workflow (status ${res.status})`);
            }
            const data = await res.json().catch(() => ({}));
            console.log('[Workflow] Save success', data);
            setToast({ text: 'Workflow saved successfully', state: 'success' });
        } catch (err: any) {
            console.error('[Workflow] Save exception', err);
            setToast({ text: err.message || 'Error saving workflow', state: 'error' });
        }
    };

    const handleTogglePublish = async () => {
        try {
            if (!workflowId) {
                setToast({ text: 'Save the workflow before publishing', state: 'error' });
                return;
            }
            const token = localStorage.getItem('token');
            const isActive = status === 'active';
            const url = `${API_CONFIG.BACKEND_BASE_URL}/workflow/workflows/${workflowId}/${isActive ? 'unpublish' : 'publish'}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });
            if (!res.ok) throw new Error(`Failed to ${isActive ? 'unpublish' : 'publish'} (status ${res.status})`);
            setStatus(isActive ? 'draft' : 'active');
            setToast({ text: `Workflow ${isActive ? 'unpublished' : 'published'} successfully`, state: 'success' });
        } catch (err: any) {
            setToast({ text: err.message || 'Error toggling publish', state: 'error' });
        }
    };

    return (
        <>
        {toast && (
          <Toast text={toast.text} state={toast.state} onClose={() => setToast(null)} />
        )}
        <header className="absolute top-0 left-0 right-0 z-10 p-4 pointer-events-none">
            <div className="flex justify-between items-center pointer-events-auto">
                {/* Left side - Workflow name */}
                <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-xl shadow-lg border border-gray-100">
                    <Menu className="h-4 w-4 text-gray-500" />
                    <div className="w-px h-5 bg-gray-200"></div>
                    <input 
                        type="text" 
                        value={flowName}
                        onChange={(e) => setFlowName(e.target.value)}
                        className="font-semibold text-gray-800 focus:ring-2 focus:ring-blue-400 text-sm focus:outline-none rounded-lg px-2 py-1 transition-all min-w-[200px]"
                        placeholder="Workflow name"
                    />
                </div>

                {/* Right side - Action buttons */}
                <div className="flex items-center gap-3">
                    {/* Secondary actions group */}
                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl shadow-lg border border-gray-100">
                        <button 
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium text-sm hover:shadow-sm"
                        >
                            <Eye className="h-4 w-4" />
                            <span>Preview</span>
                        </button>
                        
                        <div className="w-px h-6 bg-gray-200"></div>
                        
                        <button 
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium text-sm hover:shadow-sm"
                        >
                            <Download className="h-4 w-4" />
                            <span>Export PNG</span>
                        </button>
                        
                        <div className="w-px h-6 bg-gray-200"></div>
                        
                        <button 
                            className="p-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:shadow-sm"
                            title="Share workflow"
                        >
                            <Share2 className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Primary actions group */}
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleSave}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                            style={{ 
                                background: 'linear-gradient(135deg, #5268ED 0%, #4150C8 100%)',
                            }}
                        >
                            <Save className="h-4 w-4" />
                            <span>Save</span>
                        </button>
                        
                        <button 
                            onClick={handleTogglePublish}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 ${
                                status === 'active' 
                                    ? 'bg-gradient-to-br from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700' 
                                    : 'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
                            }`}
                        >
                            {status === 'active' && <Check className="h-4 w-4" />}
                            <span>{status === 'active' ? 'Published' : 'Publish'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
        </>
    );
};

export default HeaderToolbar;