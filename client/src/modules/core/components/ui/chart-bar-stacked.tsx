"use client";

import React, { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { BarChart3, MapPin } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/modules/core/components/ui/Card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/modules/core/components/ui/chart";
import { useTheme } from "@/modules/core/providers/ThemeContext";
import { cn } from "@/modules/core/lib/utils";
export interface CorridorDemandItem {
  corridor: string;
  activeLeads: number;
  monthlyValueLakhs: number;
  availableStockK: number;
}

export const generateRealtimeCorridorData = (
  inquiries: Array<{ targetCorridor?: string; location?: string; budgetMonthlyINR?: number }> = [],
  properties: Array<{ corridor?: string; city?: string; availableAreaSqFt?: number }> = []
): CorridorDemandItem[] => {
  const corridorsMap: Record<string, { leads: number; valueINR: number; stockSqFt: number }> = {
    "Dahej PCPIR": { leads: 0, valueINR: 0, stockSqFt: 0 },
    "Sanand - Viramgam": { leads: 0, valueINR: 0, stockSqFt: 0 },
    "Jhagadia GIDC": { leads: 0, valueINR: 0, stockSqFt: 0 },
    "Aspee Chikhli": { leads: 0, valueINR: 0, stockSqFt: 0 },
    "LPS Kosamba": { leads: 0, valueINR: 0, stockSqFt: 0 },
    "Bhiwandi Corridor": { leads: 0, valueINR: 0, stockSqFt: 0 },
  };

  // Aggregate inquiries
  inquiries.forEach((inq) => {
    const loc = inq.targetCorridor || inq.location || "";
    let matched = Object.keys(corridorsMap).find((c) =>
      loc.toLowerCase().includes(c.split(" ")[0].toLowerCase())
    );
    if (!matched && loc.trim()) {
      corridorsMap[loc.trim()] = { leads: 0, valueINR: 0, stockSqFt: 0 };
      matched = loc.trim();
    }
    if (matched) {
      corridorsMap[matched].leads += 1;
      corridorsMap[matched].valueINR += inq.budgetMonthlyINR || 0;
    }
  });

  // Aggregate properties stock
  properties.forEach((prop) => {
    const cor = prop.corridor || prop.city || "";
    let matched = Object.keys(corridorsMap).find((c) =>
      cor.toLowerCase().includes(c.split(" ")[0].toLowerCase())
    );
    if (!matched && cor.trim()) {
      corridorsMap[cor.trim()] = { leads: 0, valueINR: 0, stockSqFt: 0 };
      matched = cor.trim();
    }
    if (matched) {
      corridorsMap[matched].stockSqFt += prop.availableAreaSqFt || 0;
    }
  });

  return Object.entries(corridorsMap)
    .filter(([_, data]) => data.leads > 0 || data.stockSqFt > 0 || data.valueINR > 0)
    .map(([corridor, data]) => ({
      corridor: corridor.replace(" Corridor", ""),
      activeLeads: data.leads,
      monthlyValueLakhs: Math.round((data.valueINR || 0) / 100000),
      availableStockK: Math.round((data.stockSqFt || 0) / 1000),
    }))
    .sort((a, b) => b.monthlyValueLakhs - a.monthlyValueLakhs)
    .slice(0, 6);
};

export interface ChartBarStackedProps {
  data?: CorridorDemandItem[];
  inquiries?: Array<{ targetCorridor?: string; location?: string; budgetMonthlyINR?: number }>;
  properties?: Array<{ corridor?: string; city?: string; availableAreaSqFt?: number }>;
  title?: string;
  subtitle?: string;
  className?: string;
}

export const ChartBarStacked: React.FC<ChartBarStackedProps> = ({
  data,
  inquiries,
  properties,
  title = "Corridor Demand & Monthly Pipeline Value",
  subtitle = "Distribution of active tenant requirements & budget across Western India hubs",
  className,
}) => {
  const { currentTheme, isDark } = useTheme();

  const sourceData = useMemo(() => {
    if (data && data.length > 0) return data;
    if (inquiries || properties) return generateRealtimeCorridorData(inquiries, properties);
    return [];
  }, [data, inquiries, properties]);

  const barColor = useMemo(() => {
    if (currentTheme.id === 'slate') {
      return isDark ? '#38bdf8' : '#0284c7';
    }
    return currentTheme.shades[500] || '#10b981';
  }, [currentTheme, isDark]);

  const dynamicConfig = {
    monthlyValueLakhs: {
      label: "Monthly Budget (₹ Lakhs)",
      color: barColor,
    },
  } satisfies ChartConfig;

  if (sourceData.length === 0) {
    return (
      <Card className={cn("bg-surface shadow-subtle border border-border flex flex-col justify-between", className)}>
        <CardHeader className="pb-3 pt-5 px-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg border border-border bg-surface-muted text-foreground flex items-center justify-center shadow-xs">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-foreground tracking-tight">
                {title}
              </CardTitle>
              <p className="text-xs text-foreground-muted mt-0.5">{subtitle}</p>
            </div>
          </div>
        </CardHeader>
        <div className="flex flex-col items-center justify-center py-16 text-center text-foreground-muted p-6">
          <p className="text-sm font-medium">No corridor activity recorded yet</p>
          <p className="text-xs mt-1">Add inquiries with target corridor or properties with corridor locations.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-surface shadow-subtle border border-border flex flex-col justify-between", className)}>
      <CardHeader className="pb-3 pt-5 px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg border border-border bg-surface-muted text-foreground flex items-center justify-center shadow-xs">
            <BarChart3 className="w-4 h-4 text-fairway-600 dark:text-fairway-400" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground tracking-tight">
              {title}
            </CardTitle>
            <p className="text-xs text-foreground-muted mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Dynamic Legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 text-xs font-medium text-foreground-muted">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
              style={{ backgroundColor: barColor }}
            />
            <span className="text-foreground">Monthly Pipeline Demand (₹ Lakhs)</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-5 pt-1">
        <ChartContainer
          config={dynamicConfig}
          className="aspect-auto h-[320px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={sourceData}
            layout="vertical"
            barSize={20}
            barCategoryGap={10}
            margin={{ top: 8, right: 30, left: 10, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--border)" opacity={0.5} />
            <YAxis
              dataKey="corridor"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              stroke="var(--foreground)"
              fontSize={11}
              width={140}
            />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              stroke="var(--foreground-muted)"
              fontSize={11}
              tickFormatter={(val) => `₹${val}L`}
            />

            <ChartTooltip
              cursor={{ fill: "rgba(0, 0, 0, 0.04)" }}
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => {
                    const activeCount = item.payload?.activeLeads || 0;
                    return (
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-foreground-muted">Monthly Value:</span>
                          <strong className="text-foreground font-mono">₹{value} Lakhs/mo</strong>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-foreground-muted">Active Inquiries:</span>
                          <strong className="text-fairway-600 dark:text-fairway-400 font-mono">{activeCount} Inquiries</strong>
                        </div>
                      </div>
                    );
                  }}
                />
              }
            />

            <Bar
              dataKey="monthlyValueLakhs"
              fill={barColor}
              radius={[0, 6, 6, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
