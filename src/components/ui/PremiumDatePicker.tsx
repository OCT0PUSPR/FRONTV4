import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../../context/theme';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';

interface PremiumDatePickerProps {
    value?: string | Date | null;
    onChange?: (date: string | null) => void;
    label?: string;
    placeholder?: string;
    picker?: "time" | "date" | "week" | "month" | "quarter" | "year";
    disabled?: boolean;
    isDateTime?: boolean; // If true, format as datetime for Odoo (YYYY-MM-DD HH:mm:ss), otherwise date only (YYYY-MM-DD)
}

export const PremiumDatePicker: React.FC<PremiumDatePickerProps> = ({
    value,
    onChange,
    label,
    placeholder = "Select date",
    picker = "date",
    disabled,
    isDateTime = false
}) => {
    const { colors, mode } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // State for calendar navigation
    const [currentDate, setCurrentDate] = useState(() => value ? dayjs(value) : dayjs());
    
    // Update current date when value changes externally
    useEffect(() => {
        if (value) {
            setCurrentDate(dayjs(value));
        }
    }, [value]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleDateClick = (date: dayjs.Dayjs) => {
        if (onChange) {
            // Format according to Odoo's expected format
            // For datetime: 'YYYY-MM-DD HH:mm:ss'
            // For date: 'YYYY-MM-DD'
            if (isDateTime) {
                // Format as datetime: YYYY-MM-DD HH:mm:ss
                onChange(date.format('YYYY-MM-DD HH:mm:ss'));
            } else {
                // Format as date only: YYYY-MM-DD
                onChange(date.format('YYYY-MM-DD'));
            }
        }
        setIsOpen(false);
    };

    const clearDate = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onChange) {
            onChange(null);
        }
    };

    const nextMonth = () => setCurrentDate(currentDate.add(1, 'month'));
    const prevMonth = () => setCurrentDate(currentDate.subtract(1, 'month'));

    // Generate days for the current month view
    const generateDays = () => {
        const startOfMonth = currentDate.startOf('month');
        const endOfMonth = currentDate.endOf('month');
        const startDay = startOfMonth.day(); // 0 is Sunday
        const daysInMonth = currentDate.daysInMonth();
        
        const days = [];
        
        // Previous month padding
        const prevMonthEnd = currentDate.subtract(1, 'month').endOf('month');
        for (let i = 0; i < startDay; i++) {
            days.push({
                date: prevMonthEnd.subtract(startDay - 1 - i, 'day'),
                isCurrentMonth: false
            });
        }
        
        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                date: startOfMonth.date(i),
                isCurrentMonth: true
            });
        }
        
        // Next month padding to complete the grid (up to 42 cells for 6 rows)
        const remainingCells = 42 - days.length;
        const nextMonthStart = currentDate.add(1, 'month').startOf('month');
        for (let i = 0; i < remainingCells; i++) {
            days.push({
                date: nextMonthStart.add(i, 'day'),
                isCurrentMonth: false
            });
        }
        
        return days;
    };

    const displayValue = value ? dayjs(value).format('MMMM D, YYYY') : '';
    const isSelected = (date: dayjs.Dayjs) => value && dayjs(value).isSame(date, 'day');
    const isToday = (date: dayjs.Dayjs) => date.isSame(dayjs(), 'day');

    const weeks = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    return (
        <div className="w-full flex flex-col gap-1.5" ref={containerRef}>
            {label && (
                <label 
                    style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: colors.textPrimary,
                        marginBottom: "0.5rem",
                    }}
                >
                    {label}
                </label>
            )}
            
            <div className="relative">
                <div
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    className={`w-full flex items-center justify-between transition-all duration-200 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    style={{
                        padding: "10px 10px",
                        background: disabled ? colors.background : colors.card,
                        border: `1px solid ${isOpen ? '#60a5fa' : colors.border}`,
                        borderRadius: "0.75rem",
                        boxShadow: isOpen 
                            ? '0 0 0 4px rgba(96, 165, 250, 0.1)' 
                            : 'inset 0 2px 4px rgba(0,0,0,0.02)',
                        color: value ? colors.textPrimary : colors.textSecondary,
                        fontSize: "12px",
                        fontWeight: "500"
                    }}
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <CalendarIcon size={14} className="text-gray-400 flex-shrink-0" />
                        <span className={`truncate ${!value && 'opacity-70'}`}>
                            {displayValue || placeholder}
                        </span>
                    </div>
                    
                    {value && !disabled && (
                        <div 
                            onClick={clearDate}
                            className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        >
                            <X size={14} style={{ color: colors.textSecondary }} />
                        </div>
                    )}
                </div>

                <AnimatePresence>
                    {isOpen && !disabled && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="absolute z-50 mt-2 p-4 rounded-2xl shadow-xl border backdrop-blur-xl"
                            style={{
                                backgroundColor: mode === 'dark' ? 'rgba(30, 30, 35, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                borderColor: colors.border,
                                width: '320px',
                                left: 0
                            }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <button 
                                    onClick={prevMonth}
                                    className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                    style={{ color: colors.textPrimary }}
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="font-bold text-sm" style={{ color: colors.textPrimary }}>
                                    {currentDate.format('MMMM YYYY')}
                                </span>
                                <button 
                                    onClick={nextMonth}
                                    className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                    style={{ color: colors.textPrimary }}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>

                            {/* Weekdays */}
                            <div className="grid grid-cols-7 mb-2">
                                {weeks.map(day => (
                                    <div 
                                        key={day} 
                                        className="text-center text-xs font-bold py-1 opacity-50"
                                        style={{ color: colors.textSecondary }}
                                    >
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Days Grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {generateDays().map((dayObj, index) => {
                                    const isSelectedDay = isSelected(dayObj.date);
                                    const isTodayDay = isToday(dayObj.date);
                                    
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => handleDateClick(dayObj.date)}
                                            className={`
                                                relative h-9 w-9 rounded-xl text-sm font-medium flex items-center justify-center transition-all
                                                ${!dayObj.isCurrentMonth ? 'opacity-30' : ''}
                                                ${isSelectedDay ? 'shadow-lg shadow-blue-400/30' : 'hover:bg-black/5 dark:hover:bg-white/10'}
                                            `}
                                            style={{
                                                backgroundColor: isSelectedDay ? '#60a5fa' : 'transparent',
                                                color: isSelectedDay ? '#fff' : colors.textPrimary,
                                            }}
                                        >
                                            {dayObj.date.date()}
                                            {isTodayDay && !isSelectedDay && (
                                                <div 
                                                    className="absolute bottom-1.5 w-1 h-1 rounded-full" 
                                                    style={{ backgroundColor: '#60a5fa' }} 
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
