import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { DependencyGraph as GraphData } from '../types';
import { useNavigate } from 'react-router-dom';
import { Search, Maximize2, RotateCcw, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  data: GraphData | null;
}

export function DependencyGraph({ data }: Props) {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoverNode, setHoverNode] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const navigate = useNavigate();

  const langColors: Record<string, string> = {
    'TypeScript': '#3178c6', 'JavaScript': '#f7df1e', 'Python': '#3776ab',
    'Go': '#00add8', 'Rust': '#dea584', 'HTML': '#e34c26', 'CSS': '#563d7c',
    'Java': '#b07219', 'C++': '#f34b7d', 'Default': '#D2C1B6'
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

  // Compute graph state when hover/search changes
  useEffect(() => {
    const hNodes = new Set();
    const hLinks = new Set();

    if (hoverNode || searchTerm) {
      data?.nodes.forEach(n => {
        if (searchTerm && n.label.toLowerCase().includes(searchTerm.toLowerCase())) {
          hNodes.add(n.id);
        }
      });

      if (hoverNode) {
        hNodes.add(hoverNode.id);
        data?.links.forEach(link => {
          const s = typeof link.source === 'object' ? (link.source as any).id : link.source;
          const t = typeof link.target === 'object' ? (link.target as any).id : link.target;
          if (s === hoverNode.id) {
            hNodes.add(t);
            hLinks.add(link);
          } else if (t === hoverNode.id) {
            hNodes.add(s);
            hLinks.add(link);
          }
        });
      }
    }

    setHighlightNodes(hNodes);
    setHighlightLinks(hLinks);
  }, [hoverNode, searchTerm, data]);

  const handleNodeClick = useCallback((node: any) => {
    if (selectedNode?.id === node.id) {
      // Navigate on second click
      navigate(`/file/${encodeURIComponent(node.id)}`);
    } else {
      // Focus on first click
      setSelectedNode(node);
      fgRef.current.centerAt(node.x, node.y, 1000);
      fgRef.current.zoom(2.5, 1000);
    }
  }, [selectedNode, navigate]);

  const resetCamera = () => {
    setSelectedNode(null);
    fgRef.current.zoomToFit(800, 100);
  };

  if (!data || data.nodes.length === 0) {
    return (
      <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: 20 }}>
        <p style={{ color: 'rgba(210, 193, 182, 0.4)' }}>Architectural breakdown pending...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: 650, position: 'relative', background: '#030706', borderRadius: 24, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'inset 0 0 100px rgba(16, 185, 129, 0.05)' }}>
      {/* ── Control Bar ── */}
      <div style={{ position: 'absolute', top: 20, left: 24, zIndex: 10, display: 'flex', gap: 12 }}>
        <div style={{ background: 'rgba(5, 10, 8, 0.8)', padding: '4px 12px', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, backdropFilter: 'blur(12px)' }}>
          <Search size={14} style={{ color: 'var(--accent)' }} />
          <input 
            type="text" 
            placeholder="Search patterns..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#D2C1B6', fontSize: '0.75rem', padding: '8px 0', outline: 'none', width: 140 }}
          />
        </div>
        <button onClick={resetCamera} style={{ background: 'rgba(5, 10, 8, 0.8)', border: '1px solid var(--border)', borderRadius: 12, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--accent)', transition: 'all 0.2s' }} title="Reset View">
          <RotateCcw size={16} />
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
        
        nodeRelSize={6}
        linkWidth={(link: any) => highlightLinks.has(link) ? 4 : 1.5}
        linkColor={(link: any) => highlightLinks.has(link) ? 'var(--accent)' : 'rgba(210, 193, 182, 0.08)'}
        linkDirectionalParticles={(link: any) => highlightLinks.has(link) || hoverNode ? 4 : 1}
        linkDirectionalParticleSpeed={0.006}
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleColor={() => 'var(--accent)'}
        
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(node.id);
          const opacity = isHighlighted ? 1 : 0.1;
          const groupColor = langColors[node.group] || langColors.Default;
          const riskColor = node.risk_score > 75 ? '#ef4444' : node.risk_score > 45 ? '#f59e0b' : '#10b981';
          const isSelected = selectedNode?.id === node.id;

          // Selection Glow
          if (isSelected) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, 14, 0, 2 * Math.PI, false);
            ctx.fillStyle = `${riskColor}11`;
            ctx.fill();
            ctx.strokeStyle = riskColor;
            ctx.setLineDash([2, 2]);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Outer Aura
          ctx.beginPath();
          ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI, false);
          ctx.fillStyle = groupColor;
          ctx.globalAlpha = opacity * 0.25;
          ctx.fill();

          // Main Core
          ctx.beginPath();
          ctx.arc(node.x, node.y, 4.5, 0, 2 * Math.PI, false);
          ctx.fillStyle = riskColor;
          ctx.globalAlpha = opacity;
          ctx.fill();
          
          ctx.globalAlpha = 1;

          // Label Management
          const showLabel = hoverNode?.id === node.id || isSelected || (isHighlighted && highlightNodes.size > 0 && highlightNodes.has(node.id)) || globalScale > 1.8;
          
          if (showLabel) {
            const label = node.label;
            const fontSize = (isSelected ? 14 : 12) / globalScale;
            ctx.font = `${isSelected ? '900' : '600'} ${fontSize}px "Outfit", sans-serif`;
            const textWidth = ctx.measureText(label).width;
            const bPad = fontSize * 0.5;

            // Translucent Background
            ctx.fillStyle = 'rgba(3, 7, 6, 0.9)';
            ctx.roundRect(node.x - (textWidth/2 + bPad), node.y - fontSize * 2.8, textWidth + bPad*2, fontSize + bPad, 4);
            ctx.fill();
            
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isSelected ? 'var(--accent)' : isHighlighted ? '#D2C1B6' : 'rgba(210, 193, 182, 0.2)';
            ctx.fillText(label, node.x, node.y - fontSize * 2.2);
          }
        }}
        nodeCanvasObjectMode={() => 'replace'}
      />

      {/* ── Selection Portal ── */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div 
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            style={{ position: 'absolute', top: 20, right: 24, bottom: 20, width: 260, background: 'rgba(5, 10, 8, 0.9)', backdropFilter: 'blur(20px)', border: '1px solid var(--border)', borderRadius: 20, zIndex: 20, padding: 24, display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
               <Target size={20} style={{ color: 'var(--accent)' }} />
               <button onClick={() => setSelectedNode(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 900, textTransform: 'uppercase', marginBottom: 4 }}>{selectedNode.group} Logic</div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, color: '#D2C1B6', wordBreak: 'break-all' }}>{selectedNode.label}</h4>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8 }}>{selectedNode.id}</div>
              
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                 <GraphStat label="Critical Risk" value={`${Math.round(selectedNode.risk_score)}%`} color={selectedNode.risk_score > 70 ? '#ef4444' : '#10b981'} />
                 <GraphStat label="Connectivity" value={`${data.links.filter((l:any) => l.source.id === selectedNode.id || l.target.id === selectedNode.id).length} Links`} color="var(--accent)" />
              </div>
            </div>

            <button 
                onClick={() => navigate(`/file/${encodeURIComponent(selectedNode.id)}`)}
                className="btn btn-primary" 
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px' }}
            >
              Examine Codebase <Maximize2 size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ position: 'absolute', bottom: 24, right: 24, pointerEvents: 'none' }}>
        <div style={{ background: 'rgba(5,10,8,0.7)', padding: '8px 12px', borderRadius: 8, fontSize: '0.65rem', color: 'rgba(210, 193, 182, 0.4)', fontWeight: 600 }}>
          Click to Focus • Double Click to Navigate
        </div>
      </div>
    </div>
  );
}

function GraphStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1rem', fontWeight: 900, color }}>{value}</div>
    </div>
  );
}

// polyfill for roundRect
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
