import { Plus, Search, Grid3x3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { API_CONFIG } from "./config/api";

interface WorkflowCard {
  id: string | number;
  title: string;
  description: string;
  nodes: number;
  status: "draft" | "active" | "archived";
  lastModified: string;
}

const mockWorkflows: WorkflowCard[] = [
  
];

const Workflows = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [realWorkflows, setRealWorkflows] = useState<WorkflowCard[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/workflow/workflows`);
        if (!res.ok) throw new Error(`Failed to fetch workflows (${res.status})`);
        const json = await res.json().catch(() => ({}));
        const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
        const mapped: WorkflowCard[] = list.map((w: any) => ({
          id: w.id,
          title: String(w.name || `Workflow ${w.id}`),
          description: String(w.description || ''),
          nodes: Number(w.node_count || w.nodes?.length || 0),
          status: (w.status as any) || 'draft',
          lastModified: w.updated_at ? new Date(w.updated_at).toLocaleString() : '',
        }));
        setRealWorkflows(mapped);
      } catch (e) {
        console.error('[Workflows] Fetch error', e);
      }
    };
    load();
  }, []);

  const allWorkflows = useMemo(() => [...realWorkflows, ...mockWorkflows], [realWorkflows]);
  const filteredWorkflows = allWorkflows.filter((workflow) =>
    workflow.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workflow.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>Workflows</h1>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Design and manage approval workflows</p>
            </div>
            <Link to="/workflow-builder">
              <Button style={{ display: 'flex', gap: '0.5rem', backgroundColor:'#5268ED', color:'white' }}>
                <Plus style={{ height: '1rem', width: '1rem' }} />
                New Workflow
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Search and View Controls */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ position: 'relative', flex: '1', maxWidth: '28rem' }}>
            <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', height: '1rem', width: '1rem', transform: 'translateY(-50%)', color: '#6b7280' }} />
            <Input
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode("grid")}
              style={{
                backgroundColor: viewMode === "grid" ? '#5268ED' : '#ffffff',
                borderColor: '#7789ef',
                color: viewMode === "grid" ? '#ffffff' : '#000000'
              }}
            >
              <Grid3x3 style={{ height: '1rem', width: '1rem' }} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode("list")}
              style={{
                backgroundColor: viewMode === "list" ? '#5268ED' : '#ffffff',
                borderColor: '#7789ef',
                color: viewMode === "list" ? '#ffffff' : '#000000'
              }}
            >
              <List style={{ height: '1rem', width: '1rem' }} />
            </Button>
          </div>
        </div>

        {/* Workflows Grid/List */}
        {viewMode === "grid" ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1.5rem' }}>
            {filteredWorkflows.map((workflow) => (
              <Link key={workflow.id} to={`/workflow-v2/${workflow.id}`} style={{ textDecoration: 'none' }}>
                <Card style={{ height: '100%', cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
                  <CardHeader>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <CardTitle style={{ fontSize: '1.125rem' }}>{workflow.title}</CardTitle>
                      <Badge
                        variant={workflow.status === "active" ? "default" : workflow.status === "draft" ? "secondary" : "outline"}
                        style={{
                          backgroundColor: workflow.status === "active" ? '#22c55e' : workflow.status === "draft" ? '#f59e0b' : '#6b7280',
                          color: '#ffffff',
                          borderColor: 'transparent'
                        }}
                      >
                        {workflow.status}
                      </Badge>
                    </div>
                    <CardDescription>{workflow.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem', color: '#6b7280' }}>
                      <span>{workflow.nodes} nodes</span>
                      <span>{workflow.lastModified}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredWorkflows.map((workflow) => (
              <Link key={workflow.id} to={`/workflow-v2/${workflow.id}`} style={{ textDecoration: 'none' }}>
                <Card style={{ cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
                  <CardContent style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ flex: '1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                          <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>{workflow.title}</h3>
                          <Badge
                            variant={workflow.status === "active" ? "default" : workflow.status === "draft" ? "secondary" : "outline"}
                            style={{
                              backgroundColor: workflow.status === "active" ? '#22c55e' : workflow.status === "draft" ? '#f59e0b' : '#6b7280',
                              color: '#ffffff',
                              borderColor: 'transparent'
                            }}
                          >
                            {workflow.status}
                          </Badge>
                        </div>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{workflow.description}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        <span>{workflow.nodes} nodes</span>
                        <span>{workflow.lastModified}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Workflows;
