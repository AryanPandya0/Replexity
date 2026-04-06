import { useEffect, useRef, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { DependencyGraph as GraphData } from '../types';
import { useNavigate } from 'react-router-dom';

interface Props {
  data: GraphData | null;
}

export function DependencyGraph({ data }: Props) {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 400 });
  const navigate = useNavigate();

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: 600,
      });
    }
    
    // Recenter
    const timer = setTimeout(() => {
      if (fgRef.current) {
        fgRef.current.zoomToFit(400, 50);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [data]);

  const handleNodeClick = useCallback((node: any) => {
    const filePath = encodeURIComponent(node.id);
    navigate(`/file/${filePath}`);
  }, [navigate]);

  if (!data || data.nodes.length === 0) {
    return (
      <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: 12 }}>
        <p style={{ color: 'var(--text-muted)' }}>No graph data available.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: 600, position: 'relative', background: '#0a1a14', borderRadius: 16, border: '2px solid var(--border)', overflow: 'hidden' }}>
      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="transparent"
        nodeLabel={(node: any) => `${node.label} (Risk: ${Math.round(node.risk_score)})`}
        nodeColor={(node: any) => {
          if (node.risk_score > 70) return '#ef4444';
          if (node.risk_score > 40) return '#f59e0b';
          return 'var(--accent)';
        }}
        linkColor={() => 'rgba(210, 193, 182, 0.15)'}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        nodeRelSize={6}
        onNodeClick={handleNodeClick}
        cooldownTicks={100}
        onEngineStop={() => fgRef.current.zoomToFit(400, 50)}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.label;
          const fontSize = 12/globalScale;
          ctx.font = `${fontSize}px var(--font-sans)`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

          ctx.fillStyle = 'rgba(10, 26, 20, 0.8)';
          ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - fontSize * 1.5, bckgDimensions[0], bckgDimensions[1]);

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = node.risk_score > 70 ? '#ef4444' : node.risk_score > 40 ? '#f59e0b' : 'var(--text-primary)';
          ctx.fillText(label, node.x, node.y - fontSize);

          // Node circle
          ctx.beginPath(); 
          ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI, false);
          ctx.fillStyle = node.risk_score > 70 ? '#ef4444' : node.risk_score > 40 ? '#f59e0b' : 'var(--accent)';
          ctx.fill();
        }}
      />
      <div style={{ position: 'absolute', top: 16, right: 16, pointerEvents: 'none' }}>
        <div style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          Click nodes to view file details
        </div>
      </div>
    </div>
  );
}
