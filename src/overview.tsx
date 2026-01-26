import React, { useEffect, useRef } from 'react';
import { Package, Truck, BarChart3, LayoutDashboard, Warehouse, GitBranch, Settings, Shield } from 'lucide-react';
import { useTheme } from '../context/theme';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCasl } from '../context/casl';
import { ROUTE_TO_PAGE_ID } from './config/pageRoutes';

interface Props {
  onEnter?: () => void;
  theme?: 'dark' | 'light';
}

const LandingPage: React.FC<Props> = ({ onEnter, theme: propTheme }) => {
  const { mode, colors } = useTheme();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { canViewPage } = useCasl();
  const theme = propTheme || mode;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isRTL = i18n.dir() === 'rtl';
  const isDark = theme === 'dark';

  // Check permission for a route
  const canViewRoute = (url: string): boolean => {
    const pageId = ROUTE_TO_PAGE_ID[url];
    if (!pageId) return true; // Allow if no mapping exists
    return canViewPage(pageId);
  };

  // Warehouse Storage Grid Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;
    let width = 0;
    let height = 0;

    // Grid configuration - warehouse storage bins
    const cellSize = 50;
    const cellGap = 8;
    const cellSpacing = cellSize + cellGap;

    interface StorageCell {
      x: number;
      y: number;
      row: number;
      col: number;
      occupied: boolean;
      pulsePhase: number;
      activityLevel: number;
    }

    interface MovingPackage {
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
      progress: number;
      speed: number;
    }

    let grid: StorageCell[] = [];
    let packages: MovingPackage[] = [];

    const primaryColor = isDark ? { r: 99, g: 102, b: 241 } : { r: 79, g: 70, b: 229 };
    const accentColor = isDark ? { r: 6, g: 182, b: 212 } : { r: 8, g: 145, b: 178 };
    const successColor = { r: 34, g: 197, b: 94 };

    const initGrid = () => {
      grid = [];
      packages = [];

      const cols = Math.ceil(width / cellSpacing) + 2;
      const rows = Math.ceil(height / cellSpacing) + 2;

      const offsetX = (width - (cols - 1) * cellSpacing) / 2;
      const offsetY = (height - (rows - 1) * cellSpacing) / 2;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * cellSpacing + offsetX;
          const y = row * cellSpacing + offsetY;

          const distFromCenter = Math.sqrt(
            Math.pow(x - width / 2, 2) + Math.pow(y - height / 2, 2)
          );
          const maxDist = Math.min(width, height) * 0.55;

          if (distFromCenter < maxDist) {
            grid.push({
              x,
              y,
              row,
              col,
              occupied: Math.random() > 0.4,
              pulsePhase: Math.random() * Math.PI * 2,
              activityLevel: Math.random(),
            });
          }
        }
      }
    };

    const drawRoundedRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      radius: number,
      fillColor: string | null,
      strokeColor: string | null,
      lineWidth: number = 1
    ) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      if (fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
      if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      initGrid();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const animate = () => {
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, width, height);
      time += 0.012;

      // Draw storage grid
      grid.forEach((cell) => {
        const distFromCenter = Math.sqrt(
          Math.pow(cell.x - width / 2, 2) + Math.pow(cell.y - height / 2, 2)
        );
        const maxDist = Math.min(width, height) * 0.5;
        const fadeAlpha = Math.max(0, 1 - distFromCenter / maxDist);

        const pulse = Math.sin(time * 1.5 + cell.pulsePhase) * 0.5 + 0.5;
        const halfSize = cellSize / 2;

        // Draw storage bin outline
        const outlineAlpha = 0.08 * fadeAlpha;
        drawRoundedRect(
          cell.x - halfSize,
          cell.y - halfSize,
          cellSize,
          cellSize,
          6,
          null,
          `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${outlineAlpha})`,
          1.5
        );

        // Draw occupied bins with fill
        if (cell.occupied) {
          const fillAlpha = (0.04 + pulse * 0.03) * cell.activityLevel * fadeAlpha;
          const innerSize = cellSize - 8;

          drawRoundedRect(
            cell.x - innerSize / 2,
            cell.y - innerSize / 2,
            innerSize,
            innerSize,
            4,
            `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, ${fillAlpha})`,
            null
          );

          // Activity indicator for high-activity bins
          if (cell.activityLevel > 0.7) {
            const indicatorAlpha = (0.3 + pulse * 0.4) * fadeAlpha;
            const indicatorSize = 6;
            ctx.beginPath();
            ctx.arc(cell.x + halfSize - 10, cell.y - halfSize + 10, indicatorSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${successColor.r}, ${successColor.g}, ${successColor.b}, ${indicatorAlpha})`;
            ctx.fill();
          }
        }
      });

      // Spawn moving packages occasionally
      if (Math.random() < 0.015 && packages.length < 5 && grid.length > 1) {
        const fromCell = grid[Math.floor(Math.random() * grid.length)];
        const toCells = grid.filter(c =>
          c !== fromCell &&
          Math.abs(c.row - fromCell.row) <= 3 &&
          Math.abs(c.col - fromCell.col) <= 3
        );

        if (toCells.length > 0) {
          const toCell = toCells[Math.floor(Math.random() * toCells.length)];
          packages.push({
            fromX: fromCell.x,
            fromY: fromCell.y,
            toX: toCell.x,
            toY: toCell.y,
            progress: 0,
            speed: 0.008 + Math.random() * 0.01,
          });
        }
      }

      // Draw and update moving packages
      packages = packages.filter((pkg) => {
        pkg.progress += pkg.speed;
        if (pkg.progress >= 1) return false;

        const x = pkg.fromX + (pkg.toX - pkg.fromX) * pkg.progress;
        const y = pkg.fromY + (pkg.toY - pkg.fromY) * pkg.progress;

        const distFromCenter = Math.sqrt(
          Math.pow(x - width / 2, 2) + Math.pow(y - height / 2, 2)
        );
        const maxDist = Math.min(width, height) * 0.5;
        const alpha = Math.max(0, 1 - distFromCenter / maxDist);

        // Draw package
        const pkgSize = 14;
        drawRoundedRect(
          x - pkgSize / 2,
          y - pkgSize / 2,
          pkgSize,
          pkgSize,
          3,
          `rgba(${accentColor.r}, ${accentColor.g}, ${accentColor.b}, ${alpha * 0.9})`,
          `rgba(255, 255, 255, ${alpha * 0.5})`,
          1
        );

        // Draw motion trail
        const trailLength = 20;
        const dx = pkg.toX - pkg.fromX;
        const dy = pkg.toY - pkg.fromY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nx = -dx / dist;
        const ny = -dy / dist;

        const gradient = ctx.createLinearGradient(
          x, y,
          x + nx * trailLength, y + ny * trailLength
        );
        gradient.addColorStop(0, `rgba(${accentColor.r}, ${accentColor.g}, ${accentColor.b}, ${alpha * 0.4})`);
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + nx * trailLength, y + ny * trailLength);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.stroke();

        return true;
      });

      // Subtle center glow
      const centerGradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.min(width, height) * 0.35
      );
      centerGradient.addColorStop(0, `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.06)`);
      centerGradient.addColorStop(1, 'transparent');

      ctx.fillStyle = centerGradient;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.35, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animId);
    };
  }, [theme, isDark]);

  // Quick action buttons with proper order and permission checking
  const allQuickActions = [
    { icon: LayoutDashboard, label: t('Dashboard'), path: '/dashboard', color: '#10b981' },
    { icon: Truck, label: t('Transfers'), path: '/receipts', color: '#8b5cf6' },
    { icon: Package, label: t('Products'), path: '/products', color: '#6366f1' },
    { icon: Warehouse, label: t('Warehouse Management'), path: '/warehouse-management', color: '#f59e0b' },
    { icon: BarChart3, label: t('Reports'), path: '/stocks', color: '#06b6d4' },
    { icon: GitBranch, label: t('Workflow'), path: '/workflow-v2', color: '#ec4899' },
    { icon: Settings, label: t('Configuration'), path: '/uom-categories', color: '#64748b' },
    { icon: Shield, label: t('User Management'), path: '/users', color: '#ef4444' },
  ];

  // Filter quick actions based on permissions
  const quickActions = allQuickActions.filter(action => canViewRoute(action.path));

  return (
    <div
      className="w-full h-[calc(100vh-64px)] flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        backgroundColor: colors.background,
        color: colors.textPrimary,
      }}
    >
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }

        .animate-fade-in {
          animation: fadeIn 0.8s ease-out forwards;
          opacity: 0;
        }

        .animate-scale-in {
          animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }

        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
        .delay-4 { animation-delay: 0.4s; }
        .delay-5 { animation-delay: 0.5s; }

        .text-gradient {
          background: linear-gradient(
            135deg,
            ${colors.action} 0%,
            #06b6d4 50%,
            ${colors.action} 100%
          );
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s ease-in-out infinite;
        }
      `}</style>

      {/* Animated Background Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Content Container */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Pre-title */}
        <p
          className="text-xs md:text-sm font-semibold tracking-[0.2em] uppercase mb-6 animate-fade-in-up"
          style={{ color: colors.textSecondary }}
        >
          {t('Enterprise Edition')}
        </p>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-fade-in-up delay-1">
          <span style={{ color: colors.textPrimary }}>{t('Next Generation of')}</span>
          <br />
          <span className="text-gradient">{t('Warehouse Management')}</span>
        </h1>

        {/* Subheading */}
        <p
          className="text-base md:text-lg lg:text-xl mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-2"
          style={{ color: colors.textSecondary }}
        >
          {t('Real-time inventory tracking, intelligent automation, predictive analytics, and seamless operations — all in one powerful platform.')}
        </p>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 animate-fade-in-up delay-3 mt-8">
          {quickActions.map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-[1.02]"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
              }}
            >
              <action.icon size={16} style={{ color: action.color }} />
              <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs animate-fade-in delay-5"
        style={{ color: colors.textSecondary }}
      >
        &copy; 2024 OctopusWMS &middot; v14.1.0
      </div>
    </div>
  );
};

export default LandingPage;
