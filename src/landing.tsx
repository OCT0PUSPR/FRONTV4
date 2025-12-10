
import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Database, Scan, Layers } from 'lucide-react';
import { useTheme } from '../context/theme';
import { useNavigate } from 'react-router-dom';

interface Props {
  onEnter?: () => void;
  theme?: 'dark' | 'light';
}

const LandingPage: React.FC<Props> = ({ onEnter, theme: propTheme }) => {
  const { mode, colors } = useTheme();
  const navigate = useNavigate();
  const theme = propTheme || mode;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Rotating Operational Text State
  const [opTextIndex, setOpTextIndex] = useState(0);
  const opTexts = ["GLOBAL INVENTORY SYNC", "AI FLEET DISPATCH", "LIVE ORDER TRACKING"];

  useEffect(() => {
      const interval = setInterval(() => {
          setOpTextIndex(prev => (prev + 1) % opTexts.length);
      }, 3000);
      return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- Earth Particle Generation Logic ---
    
    interface Particle {
        x: number;
        y: number;
        z: number;
        size: number;
        isLand: boolean;
        baseAlpha: number;
        phi: number;
        theta: number;
    }

    let particles: Particle[] = [];
    const baseRadius = 240; // Base radius for coordinate generation

    // Refined Geography Logic
    // We use a combination of inclusion shapes (Continents) and exclusion shapes (Oceans/Seas)
    // for a more organic look.
    const isLand = (lat: number, lon: number) => {
        
        // 1. Define Major Landmasses (Inclusions)
        const continents = [
            // North America
            { latMin: 50, latMax: 75, lonMin: -170, lonMax: -55 }, // Canada/Alaska
            { latMin: 25, latMax: 50, lonMin: -125, lonMax: -65 }, // USA
            { latMin: 15, latMax: 25, lonMin: -105, lonMax: -85 }, // Mexico
            { latMin: 5, latMax: 15, lonMin: -95, lonMax: -75 },  // Central America
            { latMin: 60, latMax: 85, lonMin: -60, lonMax: -10 }, // Greenland

            // South America
            { latMin: -55, latMax: 12, lonMin: -82, lonMax: -34 }, 

            // Europe
            { latMin: 36, latMax: 72, lonMin: -10, lonMax: 45 },
            { latMin: 50, latMax: 60, lonMin: -10, lonMax: 2 }, // UK/Ireland

            // Africa
            { latMin: -35, latMax: 37, lonMin: -18, lonMax: 52 },
            
            // Asia
            { latMin: 10, latMax: 75, lonMin: 45, lonMax: 150 }, // Main Asia block
            { latMin: 10, latMax: 40, lonMin: 35, lonMax: 45 }, // Arabian Peninsula
            { latMin: 5, latMax: 30, lonMin: 70, lonMax: 90 }, // India
            
            // SE Asia & Oceania
            { latMin: -10, latMax: 25, lonMin: 95, lonMax: 150 }, // Indonesia/Philippines
            { latMin: -45, latMax: -10, lonMin: 110, lonMax: 155 }, // Australia
            { latMin: -48, latMax: -34, lonMin: 165, lonMax: 180 }, // NZ

            // Antarctica
            { latMin: -90, latMax: -65, lonMin: -180, lonMax: 180 },
        ];

        // 2. Define Water Cutouts (Exclusions) to shape the continents
        const oceans = [
            // Atlantic / Gulf of Mexico cut
            { latMin: 15, latMax: 30, lonMin: -100, lonMax: -75 }, 
            // Mediterranean Sea
            { latMin: 30, latMax: 45, lonMin: 0, lonMax: 35 },
            // Red Sea
            { latMin: 10, latMax: 30, lonMin: 35, lonMax: 42 },
            // Hudson Bay
            { latMin: 50, latMax: 65, lonMin: -95, lonMax: -75 },
            // Caribbean
            { latMin: 10, latMax: 20, lonMin: -85, lonMax: -60 },
            // Gap between Australia and Africa (Indian Ocean cleanup)
            { latMin: -50, latMax: 0, lonMin: 55, lonMax: 110 },
        ];

        let insideContinent = false;
        for (const c of continents) {
            if (lat >= c.latMin && lat <= c.latMax && lon >= c.lonMin && lon <= c.lonMax) {
                insideContinent = true;
                break;
            }
        }

        if (insideContinent) {
            // Check if it falls into an exclusion zone
            for (const o of oceans) {
                if (lat >= o.latMin && lat <= o.latMax && lon >= o.lonMin && lon <= o.lonMax) {
                    return false;
                }
            }
            // Add some organic noise to edges
            return Math.random() > 0.15; 
        }

        return false;
    };

    // Helper: Cartesian to Spherical (Lat/Lon)
    const toGeo = (x: number, y: number, z: number, r: number) => {
        const lat = Math.asin(y / r) * (180 / Math.PI);
        const lon = Math.atan2(-z, x) * (180 / Math.PI); 
        return { lat, lon };
    };

    // Generate Particles using Uniform Sphere Distribution
    const totalPoints = 7000; 
    
    for(let i=0; i<totalPoints; i++) {
        const yNorm = 1 - (i / (totalPoints - 1)) * 2; 
        const radiusAtY = Math.sqrt(1 - yNorm * yNorm);
        const thetaInc = i * 2.3999632; // Golden angle
        
        const xNorm = Math.cos(thetaInc) * radiusAtY;
        const zNorm = Math.sin(thetaInc) * radiusAtY;
        
        const x = xNorm * baseRadius;
        const y = yNorm * baseRadius;
        const z = zNorm * baseRadius;
        
        const { lat, lon } = toGeo(x, y, z, baseRadius);
        const land = isLand(lat, lon);

        // Keep all land points, very few ocean points
        if (land || Math.random() > 0.985) {
             particles.push({
                 x, y, z,
                 size: land ? Math.random() * 1.5 + 0.8 : Math.random() * 0.6 + 0.2,
                 isLand: land,
                 baseAlpha: land ? 0.8 + Math.random() * 0.2 : 0.05 + Math.random() * 0.1,
                 phi: Math.acos(y / baseRadius),
                 theta: Math.atan2(z, x)
             });
        }
    }

    // --- Shipment Lines Logic ---
    interface Shipment {
        startIdx: number;
        endIdx: number;
        progress: number;
        speed: number;
    }
    const shipments: Shipment[] = [];
    const maxShipments = 3; 

    // Pick random land nodes as hubs
    const hubs = particles.filter(p => p.isLand).filter((_, i) => i % 40 === 0);

    let angleY = 0;
    let animId: number;

    const animate = () => {
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // Dynamic Radius Calculation for Responsiveness
        const minDim = Math.min(canvas.width, canvas.height);
        // Scale globe to be roughly 80% of the smallest container dimension
        const currentRadius = Math.max(minDim * 0.4, 200); 
        const scaleFactor = currentRadius / baseRadius;

        angleY -= 0.0015; // Slower, smoother rotation

        const isDark = theme === 'dark';
        const landColor = isDark ? '99, 102, 241' : '14, 165, 233'; 
        const oceanColor = isDark ? '51, 65, 85' : '203, 213, 225'; 
        
        // Atmosphere Glow
        const grad = ctx.createRadialGradient(cx, cy, currentRadius * 0.8, cx, cy, currentRadius * 1.5);
        if (isDark) {
            grad.addColorStop(0, 'rgba(79, 70, 229, 0.1)'); 
            grad.addColorStop(1, 'rgba(0,0,0,0)');
        } else {
            grad.addColorStop(0, 'rgba(14, 165, 233, 0.05)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0,0, canvas.width, canvas.height);

        // 1. Transform Points
        const projectedPoints: {x: number, y: number, z: number, scale: number, p: Particle, idx: number}[] = [];

        particles.forEach((p, index) => {
            // Scale points based on dynamic radius
            const sx = p.x * scaleFactor;
            const sy = p.y * scaleFactor;
            const sz = p.z * scaleFactor;

            // Rotate around Y
            let x = sx * Math.cos(angleY) + sz * Math.sin(angleY);
            let z = -sx * Math.sin(angleY) + sz * Math.cos(angleY);
            let y = sy;
            
            // Tilt Axis (23.5 deg)
            const tilt = 23.5 * (Math.PI/180);
            let y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
            let z2 = y * Math.sin(tilt) + z * Math.cos(tilt);

            const fov = 1000;
            const scale = fov / (fov + z2);
            const px = cx + x * scale;
            const py = cy + y2 * scale;

            projectedPoints.push({x: px, y: py, z: z2, scale: scale, p: p, idx: index});
        });

        projectedPoints.sort((a, b) => b.z - a.z);
        
        // 2. Draw Particles
        projectedPoints.forEach((point) => {
             let alpha = point.p.baseAlpha;
             const normalizedDepth = (point.z + currentRadius) / (2 * currentRadius); 
             
             // Adjust alpha based on depth and theme
             if (isDark) {
                alpha *= (0.2 + 0.8 * normalizedDepth); 
             } else {
                alpha *= (0.3 + 0.7 * normalizedDepth); 
             }

             if (point.z < -20 * scaleFactor) alpha *= 0.1;

             ctx.fillStyle = `rgba(${point.p.isLand ? landColor : oceanColor}, ${alpha})`;
             
             ctx.beginPath();
             const drawSize = point.p.size * point.scale * (scaleFactor * 0.8); // Scale dots too
             ctx.arc(point.x, point.y, Math.max(drawSize, 0.5), 0, Math.PI * 2);
             ctx.fill();
        });

        // 3. Draw Shipment Lines
        if (shipments.length < maxShipments && Math.random() > 0.995) {
            const start = Math.floor(Math.random() * hubs.length);
            let end = Math.floor(Math.random() * hubs.length);
            while (start === end) end = Math.floor(Math.random() * hubs.length);
            
            const p1 = particles.indexOf(hubs[start]);
            const p2 = particles.indexOf(hubs[end]);
            
            if (p1 !== -1 && p2 !== -1) {
                shipments.push({ startIdx: p1, endIdx: p2, progress: 0, speed: 0.005 + Math.random() * 0.01 });
            }
        }

        ctx.lineWidth = 2.5 * scaleFactor; 
        
        for (let i = shipments.length - 1; i >= 0; i--) {
            const ship = shipments[i];
            ship.progress += ship.speed;
            
            if (ship.progress >= 1) {
                shipments.splice(i, 1);
                continue;
            }

            const startP = projectedPoints.find(pp => pp.idx === ship.startIdx);
            const endP = projectedPoints.find(pp => pp.idx === ship.endIdx);

            if (startP && endP && startP.z > -50 * scaleFactor && endP.z > -50 * scaleFactor) {
                const midX = (startP.x + endP.x) / 2;
                const midY = (startP.y + endP.y) / 2;
                const dist = Math.sqrt(Math.pow(endP.x - startP.x, 2) + Math.pow(endP.y - startP.y, 2));
                const controlY = midY - dist * 0.4; 

                const grad = ctx.createLinearGradient(startP.x, startP.y, endP.x, endP.y);
                
                if (isDark) {
                    grad.addColorStop(0, 'rgba(6, 182, 212, 0)');
                    grad.addColorStop(0.5, `rgba(34, 211, 238, ${1 - Math.abs(0.5 - ship.progress)*2})`); 
                    grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
                } else {
                    grad.addColorStop(0, 'rgba(219, 39, 119, 0)');
                    grad.addColorStop(0.5, `rgba(219, 39, 119, ${1 - Math.abs(0.5 - ship.progress)*2})`);
                    grad.addColorStop(1, 'rgba(219, 39, 119, 0)');
                }
                
                ctx.strokeStyle = grad;
                ctx.beginPath();
                ctx.moveTo(startP.x, startP.y);
                ctx.quadraticCurveTo(midX, controlY, endP.x, endP.y);
                ctx.stroke();

                const t = ship.progress;
                const invT = 1 - t;
                const dotX = invT*invT * startP.x + 2*invT*t * midX + t*t * endP.x;
                const dotY = invT*invT * startP.y + 2*invT*t * controlY + t*t * endP.y;

                ctx.fillStyle = isDark ? '#ffffff' : '#be185d'; 
                ctx.beginPath();
                ctx.arc(dotX, dotY, 3 * scaleFactor, 0, Math.PI*2);
                ctx.fill();
            }
        }

        animId = requestAnimationFrame(animate);
    };

    // Use ResizeObserver for robust sizing
    const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
             const { width, height } = entry.contentRect;
             // Match internal resolution to display size to avoid stretching
             canvas.width = width;
             canvas.height = height;
        }
    });
    
    observer.observe(canvas);
    animId = requestAnimationFrame(animate);

    return () => {
        observer.disconnect();
        cancelAnimationFrame(animId);
    };
  }, [theme]);

  const isDark = theme === 'dark';
  const handleEnter = () => {
    if (onEnter) {
      onEnter();
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div 
      className="w-full h-[calc(100vh-64px)] flex flex-col lg:flex-row font-sans transition-colors duration-500 overflow-hidden"
      style={{ 
        backgroundColor: colors.background,
        color: colors.textPrimary
      }}
    >
        {/* Left Content - Scrolls naturally with the page */}
        <div className="w-full lg:w-1/2 pt-8 pb-12 px-12 lg:pt-8 lg:pb-16 lg:px-16 flex flex-col relative z-20">
            
            {/* Main Hero */}
            <div className="flex-1 flex flex-col justify-center max-w-xl">
                
                {/* Branding */}
                <div className="mb-6 animate-enter">
                    <div className="font-bold tracking-tight text-3xl" style={{ color: colors.textPrimary }}>
                        Octopus<span style={{ color: colors.action }}>WMS</span>
                    </div>
                    <div className="text-xs font-medium tracking-widest uppercase" style={{ color: colors.textSecondary }}>Enterprise Edition</div>
                </div>

                <div 
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full border w-fit mb-8 animate-enter"
                    style={{
                        animationDelay: '0.05s',
                        backgroundColor: colors.card,
                        borderColor: colors.border
                    }}
                >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-medium" style={{ color: colors.textSecondary }}>System Operational • v2.4.0</span>
                </div>
                
                <h1 className="text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[1.1] mb-8 animate-enter" style={{animationDelay: '0.1s', color: colors.textPrimary}}>
                    Next-Gen <br />
                    <span style={{ 
                        background: `linear-gradient(to right, ${colors.action}, #06b6d4)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>Warehouse OS.</span>
                </h1>
                
                <p className="text-lg lg:text-xl mb-12 leading-relaxed animate-enter" style={{animationDelay: '0.2s', color: colors.textSecondary}}>
                    Orchestrate your entire inventory lifecycle. From automated put-away and smart binning to predictive picking and fleet loading. 
                    Experience the future of fulfillment.
                </p>

                <div className="flex gap-4 animate-enter" style={{animationDelay: '0.3s'}}>
                    <button 
                        onClick={handleEnter}
                        className="group font-bold py-4 px-10 rounded-full flex items-center gap-3 transition-all active:scale-95 shadow-lg"
                        style={{
                            backgroundColor: isDark ? '#ffffff' : colors.textPrimary,
                            color: isDark ? colors.textPrimary : '#ffffff',
                            boxShadow: isDark 
                                ? '0 0 20px rgba(255,255,255,0.2)' 
                                : '0 10px 15px -3px rgba(0,0,0,0.1)'
                        }}
                        onMouseEnter={(e) => {
                            if (isDark) {
                                e.currentTarget.style.backgroundColor = '#f4f4f5';
                                e.currentTarget.style.color = '#000000';
                            } else {
                                // Darken the button color on hover in light mode (use a darker shade)
                                const baseColor = colors.textPrimary || '#1a1a1a';
                                // Simple darkening: reduce RGB values by 20
                                if (baseColor.startsWith('#')) {
                                    const hex = baseColor.replace('#', '');
                                    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 20);
                                    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 20);
                                    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 20);
                                    e.currentTarget.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
                                } else {
                                    // Fallback to a darker shade
                                    e.currentTarget.style.backgroundColor = '#0a0a0a';
                                }
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = isDark ? '#ffffff' : colors.textPrimary;
                        }}
                    >
                        Access Dashboard <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Stats Grid */}
                <div 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-20 border-t pt-10 animate-enter"
                    style={{
                        animationDelay: '0.4s',
                        borderColor: colors.border
                    }}
                >
                    
                    {/* Stat 1 */}
                    <div className="flex items-center gap-4 group">
                        <div className="w-12 h-12 flex-shrink-0 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-indigo-500 to-cyan-400 text-white shadow-lg">
                             <Database size={22} />
                        </div>
                        <div>
                            <div className="text-3xl font-bold leading-none mb-1" style={{ color: colors.textPrimary }}>1.2M</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.textSecondary }}>Active SKUs</div>
                        </div>
                    </div>

                    {/* Stat 2 */}
                    <div className="flex items-center gap-4 group">
                        <div className="w-12 h-12 flex-shrink-0 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#fa709a] to-[#fee140] text-white shadow-lg">
                             <Scan size={22} />
                        </div>
                        <div>
                            <div className="text-3xl font-bold leading-none mb-1" style={{ color: colors.textPrimary }}>45k</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.textSecondary }}>Throughput</div>
                        </div>
                    </div>

                    {/* Stat 3 */}
                    <div className="flex items-center gap-4 group">
                         <div className="w-12 h-12 flex-shrink-0 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#f093fb] to-[#f5576c] text-white shadow-lg">
                             <Layers size={22} />
                        </div>
                        <div>
                            <div className="text-3xl font-bold leading-none mb-1" style={{ color: colors.textPrimary }}>99.9%</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.textSecondary }}>Accuracy</div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Footer */}
            <div className="mt-20 lg:mt-auto text-xs pt-12 flex gap-6 font-medium" style={{ color: colors.textSecondary }}>
                <span>&copy; 2024 OctopusWMS Inc.</span>
                <span className="cursor-pointer hover:opacity-70 transition-opacity">Security Protocol</span>
                <span className="cursor-pointer hover:opacity-70 transition-opacity">API Status</span>
            </div>
        </div>

        {/* Right Visuals - Globe Particles Canvas */}
        <div 
            className="hidden lg:block lg:w-1/2 relative overflow-hidden transition-colors duration-500 h-full"
            style={{ 
                backgroundColor: colors.background,
            }}
        >
            {/* Gradient Overlay */}
            <div 
                className="absolute inset-0 bg-gradient-to-l z-10 pointer-events-none"
                style={{
                    background: `linear-gradient(to left, transparent, transparent, ${colors.background})`
                }}
            ></div>
            
            {/* The Particle Canvas */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-100" />
            
            {/* Overlay Elements */}
            <div className="absolute bottom-12 right-12 z-20 flex flex-col items-end pointer-events-none">
                <div className="text-xs font-mono mb-2 font-bold transition-all duration-500" style={{ color: colors.textSecondary }}>
                    {opTexts[opTextIndex]}
                </div>
                <div className="flex gap-1.5">
                    <div 
                        className="w-1.5 h-1.5 rounded-full transition-all duration-500"
                        style={{
                            backgroundColor: opTextIndex === 0 ? colors.action : `${colors.action}80`,
                            transform: opTextIndex === 0 ? 'scale(1.25)' : 'scale(1)'
                        }}
                    ></div>
                    <div 
                        className="w-1.5 h-1.5 rounded-full transition-all duration-500"
                        style={{
                            backgroundColor: opTextIndex === 1 ? colors.action : `${colors.action}80`,
                            transform: opTextIndex === 1 ? 'scale(1.25)' : 'scale(1)'
                        }}
                    ></div>
                    <div 
                        className="w-1.5 h-1.5 rounded-full transition-all duration-500"
                        style={{
                            backgroundColor: opTextIndex === 2 ? colors.action : `${colors.action}80`,
                            transform: opTextIndex === 2 ? 'scale(1.25)' : 'scale(1)'
                        }}
                    ></div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default LandingPage;
