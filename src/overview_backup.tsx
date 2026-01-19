
import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Database, Scan, Layers, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../context/theme';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Props {
  onEnter?: () => void;
  theme?: 'dark' | 'light';
  toggleTheme?: () => void;
}

const LandingPage: React.FC<Props> = ({ onEnter, theme: propTheme, toggleTheme }) => {
  const { mode, colors } = useTheme();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const theme = propTheme || mode;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isRTL = i18n.dir() === 'rtl';

  // Rotating Operational Text State
  const [opTextIndex, setOpTextIndex] = useState(0);
  const opTexts = ["AUTOMATED STORAGE", "PREDICTIVE PICKING", "REAL-TIME INVENTORY"];

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

    // --- Warehouse Particle Logic ---
    
    interface Particle {
        x: number;
        y: number;
        z: number;
        size: number;
        type: 'pallet' | 'rack' | 'floor';
        colorVar: number; // For slight color variation
    }

    interface Robot {
        x: number;
        y: number;
        z: number;
        targetX: number;
        targetY: number;
        targetZ: number;
        speed: number;
        state: 'MOVING' | 'LIFTING' | 'LOWERING';
        holdTime: number;
        color: string;
    }

    let particles: Particle[] = [];
    let robots: Robot[] = [];

    // Configuration
    const rackRows = 5;       // Number of double-sided rack rows
    const rackCols = 24;      // Deepness
    const rackLevels = 7;     // Height
    const spacingX = 25;      // Width of a pallet slot
    const spacingY = 18;      // Height of a shelf
    const spacingZ = 25;      // Depth of a pallet slot
    const aisleWidth = 60;    // Width between racks for robots

    // Calculate Grid Offsets to center the warehouse
    // A "Row" consists of 2 racks back-to-back + 1 aisle
    const rowUnitWidth = (spacingX * 2) + aisleWidth;
    const totalWidth = (rackRows * rowUnitWidth) - aisleWidth; 
    const totalDepth = rackCols * spacingZ;
    const totalHeight = rackLevels * spacingY;

    // Generate Static Warehouse Structure
    const initWarehouse = () => {
        particles = [];
        robots = [];

        for (let r = 0; r < rackRows; r++) {
            const rowStartX = (r * rowUnitWidth) - (totalWidth / 2);

            // Double sided rack (Side A and Side B)
            for (let side = 0; side < 2; side++) {
                const rackX = rowStartX + (side * spacingX);

                for (let c = 0; c < rackCols; c++) {
                    const z = (c * spacingZ) - (totalDepth / 2);

                    // Vertical Levels
                    for (let l = 0; l < rackLevels; l++) {
                        const y = (l * spacingY) - (totalHeight / 3); // Shift down slightly

                        // RACK POSTS (Vertical Lines visual)
                        if (l === 0 && (c % 4 === 0)) {
                             // Create a vertical pillar effect by adding points
                             for(let h=0; h<rackLevels*spacingY; h+=spacingY/2) {
                                 particles.push({
                                     x: rackX + (side===0?-2:2), // slightly offset
                                     y: h - (totalHeight/3),
                                     z: z + spacingZ/2,
                                     size: 0.8,
                                     type: 'rack',
                                     colorVar: 0
                                 });
                             }
                        }

                        // PALETTES
                        // Randomly skip some spots to make it look realistic (80% full)
                        if (Math.random() > 0.15) {
                            particles.push({
                                x: rackX,
                                y: y,
                                z: z,
                                size: Math.random() * 1.5 + 1,
                                type: 'pallet',
                                colorVar: Math.random()
                            });
                        }
                    }
                }
            }
            
            // Generate Robots in the Aisle (to the right of the double rack)
            if (r < rackRows - 1) { // Don't put aisle after last rack if we want symmetry? Actually usually aisles are between.
                 const aisleX = rowStartX + (spacingX * 2) + (aisleWidth / 2);
                 // Spawn 1-2 robots per aisle
                 for(let i=0; i<Math.max(1, Math.random()*5); i++) {
                     const startZ = (Math.random() * totalDepth) - (totalDepth/2);
                     robots.push({
                         x: aisleX,
                         y: -(totalHeight / 3), // Floor level
                         z: startZ,
                         targetX: aisleX,
                         targetY: -(totalHeight / 3),
                         targetZ: (Math.random() * totalDepth) - (totalDepth/2),
                         speed: 2 + Math.random(),
                         state: 'MOVING',
                         holdTime: 0,
                         color: Math.random() > 0.5 ? '#f43f5e' : '#fbbf24' // Red/Amber lights
                     });
                 }
            }
        }
        
        // Floor Grid (Subtle)
        for(let x = -totalWidth/2 - 100; x <= totalWidth/2 + 100; x+=100) {
            for(let z = -totalDepth/2 - 100; z <= totalDepth/2 + 100; z+=100) {
                 if (Math.random() > 0.5) {
                    particles.push({
                        x: x,
                        y: -(totalHeight / 3) - 10,
                        z: z,
                        size: 0.5,
                        type: 'floor',
                        colorVar: 0
                    });
                 }
            }
        }
    };

    initWarehouse();

    let angleY = -0.5; // Initial angle
    let animId: number;

    const animate = () => {
        if (!canvas || !ctx) return;
        
        const { width, height } = canvas;
        const cx = width / 2;
        const cy = height / 2;

        ctx.clearRect(0, 0, width, height);

        // Rotation
        angleY += 0.002;

        const isDark = theme === 'dark';
        
        // Dynamic Colors based on Theme
        const palletColorBase = isDark ? {r: 99, g: 102, b: 241} : {r: 14, g: 165, b: 233}; // Indigo / Sky
        const rackColor = isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.5)';
        const floorColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

        // 3D Projection
        const project = (x: number, y: number, z: number) => {
            // Rotate Y
            const cos = Math.cos(angleY);
            const sin = Math.sin(angleY);
            const rx = x * cos - z * sin;
            const rz = x * sin + z * cos;
            
            // Simple Isometric-ish Tilt
            // Rotate X slightly (look down)
            const tilt = 0.4; // rads
            const ry = y * Math.cos(tilt) - rz * Math.sin(tilt);
            const rz2 = y * Math.sin(tilt) + rz * Math.cos(tilt);

            const fov = 1200;
            const scale = fov / (fov + rz2 + 400); // +400 to push back
            
            return {
                x: cx + rx * scale,
                y: cy + ry * scale,
                scale: scale,
                depth: rz2
            };
        };

        // Render Lists
        const renderList: {
            x: number, y: number, z: number, 
            size: number, color: string, depth: number
        }[] = [];

        // 1. Process Static Particles
        particles.forEach(p => {
            const proj = project(p.x, p.y, p.z);
            if (proj.scale > 0) {
                let color = '';
                if (p.type === 'floor') color = floorColor;
                else if (p.type === 'rack') color = rackColor;
                else {
                    // Pallet Color Variation
                    const alpha = 0.6 + (p.colorVar * 0.4);
                    // Occasional "Special" crate
                    if (p.colorVar > 0.95) {
                         color = isDark ? `rgba(244, 63, 94, ${alpha})` : `rgba(225, 29, 72, ${alpha})`; // Rose
                    } else if (p.colorVar > 0.90) {
                         color = isDark ? `rgba(251, 191, 36, ${alpha})` : `rgba(245, 158, 11, ${alpha})`; // Amber
                    } else {
                         color = `rgba(${palletColorBase.r}, ${palletColorBase.g}, ${palletColorBase.b}, ${alpha})`;
                    }
                }

                renderList.push({
                    x: proj.x,
                    y: proj.y,
                    z: proj.depth,
                    size: p.size * proj.scale,
                    color: color,
                    depth: proj.depth
                });
            }
        });

        // 2. Process & Update Robots
        robots.forEach(robot => {
            // State Machine
            if (robot.state === 'MOVING') {
                const dx = robot.targetX - robot.x;
                const dz = robot.targetZ - robot.z;
                const dist = Math.sqrt(dx*dx + dz*dz);
                
                if (dist < 5) {
                    // Arrived
                    robot.x = robot.targetX;
                    robot.z = robot.targetZ;
                    // Random chance to lift up to a shelf
                    if (Math.random() > 0.3) {
                         robot.state = 'LIFTING';
                         robot.targetY = (Math.floor(Math.random() * (rackLevels-1)) + 1) * spacingY - (totalHeight / 3);
                    } else {
                         // Pick new floor target
                         robot.targetZ = (Math.random() * totalDepth) - (totalDepth/2);
                    }
                } else {
                    robot.x += (dx / dist) * robot.speed;
                    robot.z += (dz / dist) * robot.speed;
                }
            } else if (robot.state === 'LIFTING') {
                 if (robot.y < robot.targetY) {
                     robot.y += 2; // Lift speed
                 } else {
                     robot.state = 'LOWERING';
                     robot.holdTime = 20; // Frames to wait
                 }
            } else if (robot.state === 'LOWERING') {
                 if (robot.holdTime > 0) {
                     robot.holdTime--;
                 } else {
                     if (robot.y > -(totalHeight / 3)) {
                         robot.y -= 2;
                     } else {
                         robot.state = 'MOVING';
                         robot.targetZ = (Math.random() * totalDepth) - (totalDepth/2);
                     }
                 }
            }

            const proj = project(robot.x, robot.y, robot.z);
            
            // Draw Robot Body
            renderList.push({
                x: proj.x,
                y: proj.y,
                z: proj.depth,
                size: 6 * proj.scale, // Bigger than pallets
                color: robot.color,
                depth: proj.depth
            });

            // Draw Beam (optional visual effect when lifting)
            if (robot.state === 'LIFTING' || robot.state === 'LOWERING') {
                 // We can't push lines to renderList easily, so draw immediately? 
                 // No, standard Z-sort won't work perfectly but for particles it's fine.
                 // Let's create a trail particle
                 renderList.push({
                    x: proj.x,
                    y: proj.y + 10 * proj.scale, // Below robot
                    z: proj.depth,
                    size: 2 * proj.scale,
                    color: `rgba(255,255,255,0.5)`,
                    depth: proj.depth
                });
            }
        });

        // 3. Sort by Depth (Painter's Algorithm)
        renderList.sort((a, b) => b.depth - a.depth);

        // 4. Draw
        renderList.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            // Draw squares for warehouse feel instead of circles?
            // Circles are faster and look like "data points"
            ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
            ctx.fill();
        });

        animId = requestAnimationFrame(animate);
    };

    // Use ResizeObserver for robust sizing
    const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
             const { width, height } = entry.contentRect;
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
                    <div className="text-xs font-medium tracking-widest uppercase" style={{ color: colors.textSecondary }}>{t('Enterprise Edition')}</div>
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
                    <span className="text-xs font-medium" style={{ color: colors.textSecondary }}>{t('System Operational • v12.4.0')}</span>
                </div>
                
                <h1 className="text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[1.1] mb-8 animate-enter" style={{animationDelay: '0.1s', color: colors.textPrimary}}>
                    {t('Next-Gen')} <br />
                    <span style={{ 
                        background: `linear-gradient(to right, ${colors.action}, #06b6d4)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>{t('Warehouse MS.')}</span>
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
                            color: isDark ? '#000000' : '#ffffff',
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
                        {t('Access Dashboard')} <ArrowRight size={20} className={`group-hover:translate-x-1 transition-transform ${isRTL ? 'rotate-180' : ''}`} />
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
                            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.textSecondary }}>{t('Active SKUs')}</div>
                        </div>
                    </div>

                    {/* Stat 2 */}
                    <div className="flex items-center gap-4 group">
                        <div className="w-12 h-12 flex-shrink-0 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#fa709a] to-[#fee140] text-white shadow-lg">
                             <Scan size={22} />
                        </div>
                        <div>
                            <div className="text-3xl font-bold leading-none mb-1" style={{ color: colors.textPrimary }}>850</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.textSecondary }}>{t('Warehouses')}</div>
                        </div>
                    </div>

                    {/* Stat 3 */}
                    <div className="flex items-center gap-4 group">
                         <div className="w-12 h-12 flex-shrink-0 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#f093fb] to-[#f5576c] text-white shadow-lg">
                             <CheckCircle2 size={22} />
                        </div>
                        <div>
                            <div className="text-3xl font-bold leading-none mb-1" style={{ color: colors.textPrimary }}>99%</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.textSecondary }}>{t('Accuracy')}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Footer */}
            <div className="mt-20 lg:mt-auto text-xs pt-12 flex gap-6 font-medium" style={{ color: colors.textSecondary }}>
                <span>&copy; 2024 OctopusWMS Inc.</span>
                <span className="cursor-pointer hover:opacity-70 transition-opacity">{t('Security Protocol')}</span>
                <span className="cursor-pointer hover:opacity-70 transition-opacity">{t('API Status')}</span>
            </div>
        </div>

        {/* Right Visuals - 3D Warehouse Canvas */}
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
