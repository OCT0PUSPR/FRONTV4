import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, Search, Filter, ChevronDown, MapPin } from 'lucide-react';
import { WAREHOUSES } from './constants';
import { TimeRange } from './types';
interface HeaderProps {
selectedWarehouseId: string;
onSelectWarehouse: (id: string) => void;
timeRange: TimeRange;
onSelectTimeRange: (range: TimeRange) => void;
}
export const Header: React.FC<HeaderProps> = ({
selectedWarehouseId,
onSelectWarehouse,
timeRange,
onSelectTimeRange
}) => {
const { t } = useTranslation();
const currentWarehouse = useMemo(() =>
WAREHOUSES.find(w => w.id === selectedWarehouseId) || WAREHOUSES[0]
, [selectedWarehouseId]);
return (
<header className="h-16 flex-none bg-white border-b border-zinc-100 px-6 flex items-center justify-between z-30 shadow-sm relative font-sans">
<div className="flex items-center gap-8">
<div className="flex items-center gap-3">
<div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white shadow-lg shadow-zinc-900/20">
<LayoutGrid size={18} />
</div>
<h1 className="text-xl font-bold tracking-tight text-zinc-900 hidden sm:block">Nexus<span className="text-zinc-400 font-normal">OS</span></h1>
</div>
<div className="h-8 w-px bg-zinc-200 hidden md:block"></div>

    {/* Warehouse Selector */}
    <div className="relative group">
      <button className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors">
        <div className="flex flex-col items-start text-left">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t("Current Location")}</span>
          <span className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            {currentWarehouse.name}
            <ChevronDown size={14} className="text-zinc-400" />
          </span>
        </div>
      </button>

      {/* Dropdown Menu */}
      <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-zinc-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left z-50">
        <div className="p-2 space-y-1">
          {WAREHOUSES.map(wh => (
            <button 
              key={wh.id}
              onClick={() => onSelectWarehouse(wh.id)}
              className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition-colors ${selectedWarehouseId === wh.id ? 'bg-zinc-50 border border-zinc-200' : 'hover:bg-gray-50'}`}
            >
              <div className={`mt-1 p-1.5 rounded-md ${selectedWarehouseId === wh.id ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                <MapPin size={14} />
              </div>
              <div>
                <div className={`text-sm font-bold ${selectedWarehouseId === wh.id ? 'text-zinc-900' : 'text-zinc-600'}`}>{wh.name}</div>
                <div className="text-xs text-zinc-400">{wh.location}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>

  <div className="flex items-center gap-4">
    <div className="hidden lg:flex bg-zinc-50 p-1 rounded-lg border border-zinc-100">
      {(['Week', 'Month', 'Year'] as TimeRange[]).map((range) => (
        <button
          key={range}
          onClick={() => onSelectTimeRange(range)}
          className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
            timeRange === range 
              ? 'bg-zinc-900 text-white shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          {range}
        </button>
      ))}
    </div>

    <div className="h-8 w-px bg-zinc-200 mx-2 hidden lg:block"></div>
    
    <button className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
      <Search size={20} />
    </button>
    <button className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
      <Filter size={20} />
    </button>
    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-600 border-2 border-white shadow-md cursor-pointer hover:ring-2 ring-zinc-200 transition-all"></div>
  </div>
</header>
  );
};