import { useEffect, useRef, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { DependencyGraph as GraphData } from '../types';
import { useNavigate } from 'react-router-dom';
import { Search, Maximize2, RotateCcw, Target, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  data: GraphData | null;
}

export function DependencyGraph({ data }: Props) {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 650 });
  const [hoverNode, setHoverNode] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const navigate = useNavigate();

  // Premium Light Theme Palette
  const langColors: Record<string, string> = {
    'TypeScript': '#3178c6', 'JavaScript': '#eab308', 'Python': '#3776ab',
    'Go': '#00add8', 'Rust': '#ea580c', 'HTML': '#e34c26', 'CSS': '#6366f1',
    'Java': '#b07219', 'C++': '#f34b7d', 'Default': '#64748b'
  };

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: 650,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const hNodes = new Set();
    const hLinks = new Set();
    if (hoverNode || searchTerm) {
      data?.nodes.forEach(n => {
        if (searchTerm && n.label.toLowerCase().includes(searchTerm.toLowerCase())) hNodes.add(n.id);
      });
      if (hoverNode) {
        hNodes.add(hoverNode.id);
        data?.links.forEach(link => {
          const s = typeof link.source === 'object' ? (link.source as any).id : link.source;
          const t = typeof link.target === 'object' ? (link.target as any).id : link.target;
          if (s === hoverNode.id) { hNodes.add(t); hLinks.add(link); }
          else if (t === hoverNode.id) { hNodes.add(s); hLinks.add(link); }
        });
      }
    }
    setHighlightNodes(hNodes);
    setHighlightLinks(hLinks);
  }, [hoverNode, searchTerm, data]);

  const handleNodeClick = useCallback((node: any) => {
    if (selectedNode?.id === node.id) {
      navigate(`/file/${encodeURIComponent(node.id)}`);
    } else {
      setSelectedNode(node);
      fgRef.current.centerAt(node.x, node.y, 800);
      fgRef.current.zoom(2, 800);
    }
  }, [selectedNode, navigate]);

  const resetCamera = () => {
    setSelectedNode(null);
    fgRef.current.zoomToFit(800, 100);
  };

  if (!data || data.nodes.length === 0) {
    return (
      <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: 24, border: '1px solid #e2e8f0' }}>
        <p style={{ color: '#94a3b8', fontWeight: 600 }}>Assembling project topology...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ 
      width: '100%', height: 650, position: 'relative', 
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', // Soft Cerulean Light Blue
      borderRadius: 24, border: '1px solid #bae6fd', overflow: 'hidden',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.04)'
    }}>
      {/* ── Light HUD ── */}
      <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 10, display: 'flex', gap: 12 }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.9)', padding: '0 16px', borderRadius: 16, border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.05)' }}>
          <Search size={16} style={{ color: '#0369a1' }} />
          <input 
            type="text" 
            placeholder="Search files..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#0c4a6e', fontSize: '0.85rem', padding: '12px 0', outline: 'none', width: 220, fontWeight: 500 }}
          />
        </div>
        <button onClick={resetCamera} style={{ background: 'rgba(255, 255, 255, 0.9)', border: '1px solid #bae6fd', borderRadius: 16, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#0369a1', transition: 'all 0.2s', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.05)' }} title="Reset View">
          <RotateCcw size={18} />
        </button>
      </div>

      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="transparent"
        onNodeHover={setHoverNode}
        onNodeClick={handleNodeClick}
        
        nodeRelSize={7}
        linkWidth={(link: any) => highlightLinks.has(link) ? 3 : 1}
        linkColor={(link: any) => highlightLinks.has(link) ? '#3b82f6' : 'rgba(100, 116, 139, 0.12)'}
        linkDirectionalParticles={(link: any) => (highlightLinks.has(link) || hoverNode) ? 6 : 1}
        linkDirectionalParticleSpeed={0.008}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={() => '#3b82f6'}
        
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(node.id);
          const opacity = isHighlighted ? 1 : 0.08;
          const riskColor = node.risk_score > 75 ? '#dc2626' : node.risk_score > 45 ? '#f59e0b' : '#10b981';
          const isSelected = selectedNode?.id === node.id;

          // Focal Pulse (Light)
          if (isSelected) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, 16, 0, 2 * Math.PI, false);
            ctx.fillStyle = `${riskColor}11`;
            ctx.fill();
            ctx.strokeStyle = riskColor;
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          // Main Node Core
          ctx.beginPath();
          ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI, false);
          ctx.fillStyle = riskColor;
          ctx.globalAlpha = opacity;
          ctx.fill();
          
          // White Glow effect on node
          ctx.beginPath();
          ctx.arc(node.x, node.y, 3, 0, 2 * Math.PI, false);
          ctx.fillStyle = '#FFFFFF';
          ctx.globalAlpha = opacity * 0.4;
          ctx.fill();
          
          ctx.globalAlpha = 1;

          // PERFECT LABELS (Visible on each node)
          const label = node.label;
          const isFocus = hoverNode?.id === node.id || isSelected || (isHighlighted && highlightNodes.has(node.id) && highlightNodes.size > 0);
          
          // Always show labels if they are high risk or search result or focus, otherwise show small labels
          const fontSize = (isFocus ? 14 : 10) / globalScale;
          ctx.font = `${isFocus ? '800' : '500'} ${fontSize}px "Inter", sans-serif`;
          const textWidth = ctx.measureText(label).width;
          const pad = 8/globalScale;
          
          // Label Pill Background
          ctx.fillStyle = isFocus ? '#1e293b' : 'rgba(255, 255, 255, 0.9)';
          ctx.shadowColor = 'rgba(0,0,0,0.1)';
          ctx.shadowBlur = 4;
          ctx.roundRect(node.x - textWidth/2 - pad, node.y - fontSize * 3.4, textWidth + pad*2, fontSize + pad*1.2, 20/globalScale);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Label Border (for light themed visibility)
          if (!isFocus) {
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 0.5/globalScale;
            ctx.stroke();
          }

          // Text Rendering
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = isFocus ? '#FFFFFF' : '#475569';
          ctx.globalAlpha = isFocus ? 1 : Math.max(0.2, opacity);
          ctx.fillText(label, node.x, (node.y - fontSize * 2.8));
          ctx.globalAlpha = 1;
        }}
        nodeCanvasObjectMode={() => 'replace'}
      />

      {/* ── Light Sidebar ── */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div 
            initial={{ x: 340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 340, opacity: 0 }}
            style={{ 
              position: 'absolute', top: 24, right: 24, bottom: 24, width: 300, 
              background: 'rgba(255, 255, 255, 0.95)', border: '1px solid #bae6fd', borderRadius: 24, zIndex: 20, 
              padding: 32, display: 'flex', flexDirection: 'column', backdropFilter: 'blur(20px)',
              boxShadow: '-10px 0 40px rgba(100, 116, 139, 0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
               <div style={{ background: '#e0f2fe', padding: 10, borderRadius: 12 }}>
                 <Target size={20} style={{ color: '#0ea5e9' }} />
               </div>
               <button onClick={() => setSelectedNode(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 8 }}>✕</button>
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: 900, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Analysis Target</div>
              <h4 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: '#0c4a6e', lineHeight: 1.2, wordBreak: 'break-all' }}>{selectedNode.label}</h4>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 12, wordBreak: 'break-all' }}>{selectedNode.id}</div>
              
              <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>
                 <DataBox label="Structural Risk" value={`${Math.round(selectedNode.risk_score)}%`} color={selectedNode.risk_score > 70 ? '#dc2626' : '#10b981'} />
                 <DataBox label="Impact Degree" value={`${data.links.filter((l:any) => l.source.id === selectedNode.id || l.target.id === selectedNode.id).length} Active Imports`} color="#0ea5e9" />
              </div>
            </div>

            <button 
                onClick={() => navigate(`/file/${encodeURIComponent(selectedNode.id)}`)}
                style={{ 
                  width: '100%', background: '#0c4a6e', color: '#FFFFFF', border: 'none', 
                  borderRadius: 16, fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '18px',
                  boxShadow: '0 10px 20px rgba(3, 105, 161, 0.2)'
                }}
            >
              Analyze Module <Maximize2 size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ position: 'absolute', bottom: 24, left: 24, display: 'flex', gap: 8 }}>
          <div style={{ background: '#FFFFFF', padding: '10px 18px', borderRadius: 14, border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
             <Info size={14} /> Scroll to Zoom • Select to Focus
          </div>
      </div>
    </div>
  );
}

function DataBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 16, border: '1px solid #f1f5f9' }}>
      <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: '1.2rem', fontWeight: 900, color }}>{value}</div>
    </div>
  );
}

// Polyfill
if (typeof (CanvasRenderingContext2D.prototype as any).roundRect !== 'function') {
  (CanvasRenderingContext2D.prototype as any).roundRect = function (x: number, y: number, w: number, h: number, r: number) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}
