import React, { useState, useMemo, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Flame,
  Calendar,
  Layers,
  BarChart3,
  PieChart as PieIcon,
  Zap,
  ArrowUpRight,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Task, TaskList, TaskCategory } from '../types/index.js';
import { useTheme } from '../context/ThemeContext.js';
import { api } from '../services/api.js';

interface ProductivityDashboardProps {
  lists?: TaskList[];
  onRefresh?: () => void;
}

type TimeHorizon = '7d' | '14d' | '30d';
type ActiveChartTab = 'trends' | 'completionRate' | 'categories' | 'lists';

const CATEGORY_COLORS: Record<TaskCategory, { fill: string; stroke: string; label: string }> = {
  S: { fill: '#3b82f6', stroke: '#2563eb', label: 'Small [S]' },
  NS: { fill: '#f59e0b', stroke: '#d97706', label: 'Not Small [NS]' },
  M: { fill: '#8b5cf6', stroke: '#7c3aed', label: 'Medium [M]' },
  A: { fill: '#f43f5e', stroke: '#e11d48', label: 'Action [A]' },
};

export const ProductivityDashboard: React.FC<ProductivityDashboardProps> = ({
  lists = [],
  onRefresh,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('14d');
  const [activeTab, setActiveTab] = useState<ActiveChartTab>('trends');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedListFilter, setSelectedListFilter] = useState<string>('all');

  const fetchAllTasks = async () => {
    try {
      setIsLoading(true);
      // Fetch all tasks including completed to compute real historical analytics
      const tasks = await api.getAllTasks(undefined, true);
      setAllTasks(tasks);
    } catch (err) {
      console.error('Failed to load all tasks for analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTasks();
  }, []);

  const handleRefresh = async () => {
    await fetchAllTasks();
    if (onRefresh) onRefresh();
  };

  // Filter tasks if specific list selected
  const scopedTasks = useMemo(() => {
    if (selectedListFilter === 'all') return allTasks;
    return allTasks.filter((t) => t.taskListId === selectedListFilter);
  }, [allTasks, selectedListFilter]);

  // Number of days in horizon
  const horizonDays = useMemo(() => {
    switch (timeHorizon) {
      case '7d':
        return 7;
      case '14d':
        return 14;
      case '30d':
        return 30;
      default:
        return 14;
    }
  }, [timeHorizon]);

  // Aggregate time-series data for daily trends and completion rate
  const timeSeriesData = useMemo(() => {
    const days: {
      dateStr: string;
      label: string;
      fullDate: string;
      completed: number;
      created: number;
      inProgress: number;
      completionRate: number;
      cumulativeCompleted: number;
      cumulativeCreated: number;
      velocity: number;
    }[] = [];

    const now = new Date();
    // Normalize to end of current day
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // Generate continuous date slots
    for (let i = horizonDays - 1; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const shortLabel = d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      const fullDate = d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      days.push({
        dateStr,
        label: shortLabel,
        fullDate,
        completed: 0,
        created: 0,
        inProgress: 0,
        completionRate: 0,
        cumulativeCompleted: 0,
        cumulativeCreated: 0,
        velocity: 0,
      });
    }

    const dayMap = new Map(days.map((item) => [item.dateStr, item]));

    scopedTasks.forEach((task) => {
      // Completed date
      if (task.completed) {
        const completedDateRaw = task.completedAt || task.updatedAt || task.createdAt;
        if (completedDateRaw) {
          const compDate = new Date(completedDateRaw);
          if (!isNaN(compDate.getTime())) {
            const cStr = `${compDate.getFullYear()}-${String(compDate.getMonth() + 1).padStart(2, '0')}-${String(compDate.getDate()).padStart(2, '0')}`;
            const target = dayMap.get(cStr);
            if (target) {
              target.completed += 1;
            }
          }
        }
      }

      // Created date
      if (task.createdAt) {
        const createdDate = new Date(task.createdAt);
        if (!isNaN(createdDate.getTime())) {
          const crStr = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}-${String(createdDate.getDate()).padStart(2, '0')}`;
          const target = dayMap.get(crStr);
          if (target) {
            target.created += 1;
          }
        }
      }

      // In-progress tasks
      if (task.inProgress && !task.completed) {
        // Tag to latest days
        const latest = days[days.length - 1];
        if (latest) {
          latest.inProgress += 1;
        }
      }
    });

    // Compute cumulative metrics, completion rates, and net velocity
    let runningCompleted = 0;
    let runningCreated = 0;

    days.forEach((item) => {
      runningCompleted += item.completed;
      runningCreated += item.created;
      item.cumulativeCompleted = runningCompleted;
      item.cumulativeCreated = runningCreated;
      item.velocity = item.completed - item.created;

      // Completion rate: completed / total active+completed in that window
      const totalInDay = item.completed + item.created;
      item.completionRate =
        totalInDay > 0
          ? Math.round((item.completed / totalInDay) * 100)
          : item.completed > 0
          ? 100
          : 0;
    });

    return days;
  }, [scopedTasks, horizonDays]);

  // Overall KPI metrics
  const kpis = useMemo(() => {
    const total = scopedTasks.length;
    const completed = scopedTasks.filter((t) => t.completed).length;
    const inProgress = scopedTasks.filter((t) => t.inProgress && !t.completed).length;
    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Window completed
    const completedInWindow = timeSeriesData.reduce((acc, curr) => acc + curr.completed, 0);
    const createdInWindow = timeSeriesData.reduce((acc, curr) => acc + curr.created, 0);

    // Productivity velocity: Average completed tasks per active day with completions
    const activeDays = timeSeriesData.filter((d) => d.completed > 0).length;
    const velocity = activeDays > 0 ? (completedInWindow / activeDays).toFixed(1) : '0';

    // Daily streak calculation (consecutive days leading up to today with >=1 completion)
    let streak = 0;
    for (let i = timeSeriesData.length - 1; i >= 0; i--) {
      if (timeSeriesData[i].completed > 0) {
        streak++;
      } else {
        // If today has 0 but yesterday had completions, don't break streak immediately if today is early
        if (i === timeSeriesData.length - 1) continue;
        break;
      }
    }

    return {
      total,
      completed,
      inProgress,
      pending,
      completionRate,
      completedInWindow,
      createdInWindow,
      velocity,
      streak,
    };
  }, [scopedTasks, timeSeriesData]);

  // Category breakdown data for Pie / Bar chart
  const categoryChartData = useMemo(() => {
    const catMap: Record<
      TaskCategory,
      {
        category: TaskCategory;
        label: string;
        total: number;
        completed: number;
        inProgress: number;
        pending: number;
        completionRate: number;
        fill: string;
      }
    > = {
      S: { category: 'S', label: 'Small [S]', total: 0, completed: 0, inProgress: 0, pending: 0, completionRate: 0, fill: '#3b82f6' },
      NS: { category: 'NS', label: 'Not Small [NS]', total: 0, completed: 0, inProgress: 0, pending: 0, completionRate: 0, fill: '#f59e0b' },
      M: { category: 'M', label: 'Medium [M]', total: 0, completed: 0, inProgress: 0, pending: 0, completionRate: 0, fill: '#8b5cf6' },
      A: { category: 'A', label: 'Action [A]', total: 0, completed: 0, inProgress: 0, pending: 0, completionRate: 0, fill: '#f43f5e' },
    };

    scopedTasks.forEach((t) => {
      const cats: TaskCategory[] =
        Array.isArray(t.categories) && t.categories.length > 0
          ? t.categories
          : [t.category || 'S'];

      cats.forEach((cat) => {
        if (catMap[cat]) {
          catMap[cat].total += 1;
          if (t.completed) {
            catMap[cat].completed += 1;
          } else {
            catMap[cat].pending += 1;
            if (t.inProgress) catMap[cat].inProgress += 1;
          }
        }
      });
    });

    return Object.values(catMap).map((item) => ({
      ...item,
      completionRate: item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0,
    }));
  }, [scopedTasks]);

  // List breakdown data
  const listChartData = useMemo(() => {
    if (lists.length === 0) return [];

    return lists.map((list) => {
      const listTasks = allTasks.filter((t) => t.taskListId === list._id);
      const total = listTasks.length;
      const completed = listTasks.filter((t) => t.completed).length;
      const inProgress = listTasks.filter((t) => t.inProgress && !t.completed).length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        id: list._id,
        title: list.title.length > 18 ? list.title.slice(0, 18) + '...' : list.title,
        fullTitle: list.title,
        total,
        completed,
        inProgress,
        pending: total - completed,
        completionRate: rate,
      };
    });
  }, [lists, allTasks]);

  // Average completion rate benchmark for reference line
  const averageRate = useMemo(() => {
    if (timeSeriesData.length === 0) return 0;
    const rates = timeSeriesData.map((d) => d.completionRate).filter((r) => r > 0);
    if (rates.length === 0) return kpis.completionRate;
    return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
  }, [timeSeriesData, kpis.completionRate]);

  // Custom tooltips for recharts
  const renderCustomTrendsTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-lg text-xs space-y-1.5 min-w-[170px]">
        <p className="font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-1">
          {data.fullDate}
        </p>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Tasks Completed:
          </span>
          <span className="font-bold">{data.completed}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Tasks Created:
          </span>
          <span className="font-bold">{data.created}</span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-1 text-zinc-500 dark:text-zinc-400">
          <span>Completion Rate:</span>
          <span className="font-bold text-zinc-800 dark:text-zinc-200">
            {data.completionRate}%
          </span>
        </div>
      </div>
    );
  };

  const renderCustomRateTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-lg text-xs space-y-1.5 min-w-[170px]">
        <p className="font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-1">
          {data.fullDate}
        </p>
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-500 dark:text-zinc-400">Daily Efficiency:</span>
          <span className="font-extrabold text-blue-600 dark:text-blue-400">
            {data.completionRate}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 text-zinc-500 dark:text-zinc-400">
          <span>Done vs Created:</span>
          <span className="font-semibold">
            {data.completed} / {data.created}
          </span>
        </div>
      </div>
    );
  };

  const gridColor = isDark ? '#27272a' : '#f4f4f5';
  const axisColor = isDark ? '#71717a' : '#a1a1aa';

  return (
    <section
      aria-label="Productivity and Completion Trends"
      className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden mb-8 transition-all"
    >
      {/* Top Banner / Header */}
      <div className="p-5 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-zinc-50/50 via-white to-zinc-50/30 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Productivity & Completion Trends</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {kpis.completionRate}% overall rate
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Real-time task velocity, completion throughput, and category productivity
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* List Selector Dropdown (if multiple lists exist) */}
          {lists.length > 1 && (
            <div className="relative">
              <select
                value={selectedListFilter}
                onChange={(e) => setSelectedListFilter(e.target.value)}
                aria-label="Filter analytics by list"
                className="text-xs font-semibold bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
              >
                <option value="all">All Lists ({allTasks.length} tasks)</option>
                {lists.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Time Horizon Segmented Control */}
          <div
            className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700/80"
            role="group"
            aria-label="Time horizon"
          >
            {(['7d', '14d', '30d'] as TimeHorizon[]).map((horizon) => (
              <button
                key={horizon}
                type="button"
                onClick={() => setTimeHorizon(horizon)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  timeHorizon === horizon
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {horizon === '7d' ? '7 Days' : horizon === '14d' ? '14 Days' : '30 Days'}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            title="Refresh analytics data"
            className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* Collapse / Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand analytics' : 'Collapse analytics'}
            className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-5 sm:p-6 space-y-6">
          {/* KPI Stat Cards Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Completion Rate KPI */}
            <div className="bg-zinc-50/70 dark:bg-zinc-800/40 p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Completion Rate</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-zinc-900 dark:text-white">
                  {kpis.completionRate}%
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {kpis.completed}/{kpis.total}
                </span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, kpis.completionRate)}%` }}
                />
              </div>
            </div>

            {/* Window Throughput */}
            <div className="bg-zinc-50/70 dark:bg-zinc-800/40 p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  Done ({timeHorizon})
                </span>
                <Zap className="w-4 h-4 text-blue-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {kpis.completedInWindow}
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  tasks finished
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                {kpis.createdInWindow} new created in window
              </p>
            </div>

            {/* In Progress */}
            <div className="bg-zinc-50/70 dark:bg-zinc-800/40 p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">In Progress</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                  {kpis.inProgress}
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">active now</span>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                {kpis.pending} pending total
              </p>
            </div>

            {/* Velocity */}
            <div className="bg-zinc-50/70 dark:bg-zinc-800/40 p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Daily Velocity</span>
                <ArrowUpRight className="w-4 h-4 text-purple-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {kpis.velocity}
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">tasks/day</span>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                on active completion days
              </p>
            </div>

            {/* Current Streak */}
            <div className="bg-zinc-50/70 dark:bg-zinc-800/40 p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Active Streak</span>
                <Flame className="w-4 h-4 text-rose-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                  {kpis.streak}
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {kpis.streak === 1 ? 'day' : 'days'}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                consecutive daily progress
              </p>
            </div>
          </div>

          {/* Chart View Selection Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div
              className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700/80"
              role="tablist"
              aria-label="Analytics view mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'trends'}
                onClick={() => setActiveTab('trends')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'trends'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Productivity Trends</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'completionRate'}
                onClick={() => setActiveTab('completionRate')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'completionRate'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Completion Rates</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'categories'}
                onClick={() => setActiveTab('categories')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'categories'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <PieIcon className="w-3.5 h-3.5" />
                <span>Category Breakdown</span>
              </button>

              {lists.length > 1 && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'lists'}
                  onClick={() => setActiveTab('lists')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    activeTab === 'lists'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>List Comparison</span>
                </button>
              )}
            </div>

            {/* Quick Chart Legend */}
            <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              {activeTab === 'trends' && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Completed</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span>Created</span>
                  </span>
                </>
              )}
              {activeTab === 'completionRate' && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span>Daily Efficiency %</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 border-t border-dashed border-amber-500" />
                    <span>Avg Benchmark ({averageRate}%)</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Recharts Visualizations */}
          <div className="w-full h-72 sm:h-80 pt-2">
            {/* View 1: Productivity Trends (Area Chart) */}
            {activeTab === 'trends' && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={timeSeriesData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                  <XAxis
                    dataKey="label"
                    stroke={axisColor}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke={axisColor}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={renderCustomTrendsTooltip} />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorCompleted)"
                    activeDot={{ r: 5, strokeWidth: 0, fill: '#10b981' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="created"
                    name="Created"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#colorCreated)"
                    activeDot={{ r: 4, strokeWidth: 0, fill: '#3b82f6' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {/* View 2: Completion Rates Over Time (Line Chart with Benchmark) */}
            {activeTab === 'completionRate' && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={timeSeriesData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                  <XAxis
                    dataKey="label"
                    stroke={axisColor}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke={axisColor}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    unit="%"
                  />
                  <Tooltip content={renderCustomRateTooltip} />
                  <ReferenceLine
                    y={averageRate}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Avg ${averageRate}%`,
                      position: 'insideTopRight',
                      fill: isDark ? '#f59e0b' : '#d97706',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completionRate"
                    name="Completion Rate"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* View 3: Category Breakdown (Stacked Bar Chart) */}
            {activeTab === 'categories' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-center">
                {/* Bar Chart comparing Categories */}
                <div className="md:col-span-2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryChartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      barCategoryGap="25%"
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                      <XAxis
                        dataKey="label"
                        stroke={axisColor}
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke={axisColor}
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ fill: isDark ? '#27272a' : '#f4f4f5', opacity: 0.5 }}
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const data = payload[0]?.payload;
                          if (!data) return null;
                          return (
                            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-lg text-xs space-y-1">
                              <p className="font-bold text-zinc-900 dark:text-zinc-100">
                                {data.label}
                              </p>
                              <div className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400">
                                <span>Completed:</span>
                                <span className="font-bold">{data.completed}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-amber-600 dark:text-amber-400">
                                <span>In Progress:</span>
                                <span className="font-bold">{data.inProgress}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-zinc-500">
                                <span>Pending:</span>
                                <span className="font-bold">{data.pending}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-1 font-bold">
                                <span>Completion Rate:</span>
                                <span className="text-blue-600 dark:text-blue-400">
                                  {data.completionRate}%
                                </span>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Bar
                        dataKey="completed"
                        name="Completed"
                        fill="#10b981"
                        stackId="a"
                        radius={[0, 0, 4, 4]}
                      />
                      <Bar
                        dataKey="inProgress"
                        name="In Progress"
                        fill="#f59e0b"
                        stackId="a"
                      />
                      <Bar
                        dataKey="pending"
                        name="Pending"
                        fill={isDark ? '#3f3f46' : '#d4d4d8'}
                        stackId="a"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Donut Chart / Category Distribution Summary */}
                <div className="flex flex-col items-center justify-center p-3 bg-zinc-50/50 dark:bg-zinc-800/20 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 h-full">
                  <div className="w-36 h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          dataKey="completed"
                          nameKey="label"
                          innerRadius={42}
                          outerRadius={65}
                          paddingAngle={3}
                        >
                          {categoryChartData.map((entry) => (
                            <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category].fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [`${value} completed`, name]}
                          contentStyle={{
                            backgroundColor: isDark ? '#18181b' : '#ffffff',
                            borderColor: isDark ? '#27272a' : '#e4e4e7',
                            borderRadius: '0.75rem',
                            fontSize: '12px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2 text-[11px] w-full max-w-[200px]">
                    {categoryChartData.map((c) => (
                      <div key={c.category} className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: CATEGORY_COLORS[c.category].fill }}
                        />
                        <span className="font-semibold truncate">[{c.category}]</span>
                        <span className="text-zinc-400 ml-auto">{c.completed}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* View 4: List Comparison (Horizontal Bar Chart) */}
            {activeTab === 'lists' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={listChartData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                  <XAxis
                    type="number"
                    stroke={axisColor}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    unit="%"
                  />
                  <YAxis
                    type="category"
                    dataKey="title"
                    stroke={axisColor}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={110}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0]?.payload;
                      if (!data) return null;
                      return (
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-lg text-xs space-y-1">
                          <p className="font-bold text-zinc-900 dark:text-zinc-100">
                            {data.fullTitle}
                          </p>
                          <div className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400">
                            <span>Completed Tasks:</span>
                            <span className="font-bold">
                              {data.completed} / {data.total}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-blue-600 dark:text-blue-400 font-bold border-t border-zinc-100 dark:border-zinc-800 pt-1">
                            <span>Completion Rate:</span>
                            <span>{data.completionRate}%</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="completionRate"
                    name="Completion Rate"
                    fill="#3b82f6"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
