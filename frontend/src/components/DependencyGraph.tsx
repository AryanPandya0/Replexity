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
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const navigate = useNavigate();

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: 600,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    
    // Initial zoom-to-fit once data is loaded
    const timer = setTimeout(() => {
      if (fgRef.current && data && data.nodes.length > 0) {
        fgRef.current.zoomToFit(400, 50);
      }
    }, 1000);

    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(timer);
    };
  }, [data]);

  const handleNodeClick = useCallback((node: any) => {
    const filePath = encodeURIComponent(node.id);
    navigate(`/file/${filePath}`);
  }, [navigate]);

  if (!data || data.nodes.length === 0) {
    return (
      <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: 12 }}>
        <p style={{ color: 'rgba(210, 193, 182, 0.4)' }}>No graph data available.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: 600, position: 'relative', background: '#070f0c', borderRadius: 16, border: '2px solid var(--border)', overflow: 'hidden' }}>
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
          return '#D2C1B6';
        }}
        linkColor={() => 'rgba(210, 193, 182, 0.1)'}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        nodeRelSize={6}
        onNodeClick={handleNodeClick}
        cooldownTicks={100}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.label;
          const fontSize = 12/globalScale;
          ctx.font = `${fontSize}px "Inter", "Outfit", sans-serif`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.4);

          // Background box for label
          ctx.fillStyle = 'rgba(7, 15, 12, 0.9)';
          ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - fontSize * 1.8, bckgDimensions[0], bckgDimensions[1]);

          // Text
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = node.risk_score > 70 ? '#ef4444' : node.risk_score > 40 ? '#f59e0b' : '#D2C1B6';
          ctx.fillText(label, node.x, (node.y - fontSize * 1.2));

          // Draw node circle manually 
          ctx.beginPath();
          ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI, false);
          ctx.fill();
        }}
        nodeCanvasObjectMode={() => 'after'}
      />
      <div style={{ position: 'absolute', top: 16, right: 16, pointerEvents: 'none' }}>
        <div style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', fontSize: '0.65rem', color: 'rgba(210, 193, 182, 0.6)', fontWeight: 600 }}>
          Scroll to Zoom • Drag to Pan
        </div>
      </div>
    </div>
  );
}
