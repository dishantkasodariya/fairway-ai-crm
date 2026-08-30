"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
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

export const chartBarStackedDescription = "A horizontal stacked bar chart showing revenue by channel";

export interface ChannelRevenueItem {
  month: string;
  online: number;
  inStore: number;
  wholesale: number;
  marketplace: number;
}

const DEFAULT_CHART_DATA: ChannelRevenueItem[] = [
  { month: "Jan", online: 42, inStore: 22, wholesale: 18, marketplace: 14 },
  { month: "Feb", online: 38, inStore: 25, wholesale: 22, marketplace: 16 },
  { month: "Mar", online: 50, inStore: 27, wholesale: 19, marketplace: 13 },
  { month: "Apr", online: 44, inStore: 26, wholesale: 24, marketplace: 18 },
  { month: "May", online: 58, inStore: 30, wholesale: 23, marketplace: 20 },
  { month: "Jun", online: 62, inStore: 28, wholesale: 25, marketplace: 22 },
];

const chartConfig = {
  online: {
    label: "Online",
    color: "#18181B",
  },
  inStore: {
    label: "In-Store",
    color: "#52525B",
  },
  wholesale: {
    label: "Wholesale",
    color: "#71717A",
  },
  marketplace: {
    label: "Marketplace",
    color: "#A1A1AA",
  },
} satisfies ChartConfig;

export interface ChartBarStackedProps {
  data?: ChannelRevenueItem[];
  title?: string;
  className?: string;
}

export const ChartBarStacked: React.FC<ChartBarStackedProps> = ({
  data = DEFAULT_CHART_DATA,
  title = "Revenue by Channel",
  className,
}) => {
  const { currentTheme, isDark } = useTheme();

  const onlineColor = currentTheme.shades[700];
  const inStoreColor = currentTheme.shades[500];
  const wholesaleColor = currentTheme.accentShades[500];
  const marketplaceColor = currentTheme.accentShades[300];

  const dynamicConfig = {
    online: {
      label: "Online",
      color: onlineColor,
    },
    inStore: {
      label: "In-Store",
      color: inStoreColor,
    },
    wholesale: {
      label: "Wholesale",
      color: wholesaleColor,
    },
    marketplace: {
      label: "Marketplace",
      color: marketplaceColor,
    },
  } satisfies ChartConfig;

  return (
    <Card className={cn("bg-surface shadow-subtle border border-border flex flex-col justify-between", className)}>
      <CardHeader className="pb-3 pt-5 px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg border border-border bg-surface-muted/60 flex items-center justify-center text-foreground shadow-xs">
            <BarChart3 className="w-4 h-4" />
          </div>
          <CardTitle className="text-base font-bold text-foreground tracking-tight">
            {title}
          </CardTitle>
        </div>

        {/* Custom Header Legend matching attached design */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 text-xs font-medium text-foreground-muted">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block transition-colors duration-300"
              style={{ backgroundColor: onlineColor }}
            />
            <span>Online</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block transition-colors duration-300"
              style={{ backgroundColor: inStoreColor }}
            />
            <span>In-Store</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block transition-colors duration-300"
              style={{ backgroundColor: wholesaleColor }}
            />
            <span>Wholesale</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block transition-colors duration-300"
              style={{ backgroundColor: marketplaceColor }}
            />
            <span>Marketplace</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-5 pt-1">
        <ChartContainer
          config={dynamicConfig}
          className="aspect-auto h-[260px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={data}
            layout="vertical"
            barSize={18}
            barCategoryGap={12}
            margin={{ top: 8, right: 16, left: -4, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} vertical={false} />
            <YAxis
              dataKey="month"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: isDark ? "#9CA3AF" : "#66736C", fontSize: 12, fontWeight: 500 }}
            />
            <XAxis
              type="number"
              domain={[0, 140]}
              ticks={[0, 30, 60, 90, 120]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(val) => (val === 0 ? "$0" : `$${val}K`)}
              tick={{ fill: isDark ? "#9CA3AF" : "#66736C", fontSize: 11, fontWeight: 500 }}
            />

            <ChartTooltip
              cursor={{ fill: "rgba(0, 0, 0, 0.03)" }}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex items-center justify-between gap-4 w-full text-xs">
                      <span className="text-foreground capitalize">{name}:</span>
                      <span className="font-bold text-foreground font-mono">
                        ${value}K
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar
              dataKey="online"
              stackId="revenue"
              fill={onlineColor}
              radius={[4, 0, 0, 4]}
            />
            <Bar
              dataKey="inStore"
              stackId="revenue"
              fill={inStoreColor}
            />
            <Bar
              dataKey="wholesale"
              stackId="revenue"
              fill={wholesaleColor}
            />
            <Bar
              dataKey="marketplace"
              stackId="revenue"
              fill={marketplaceColor}
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};


export default ChartBarStacked;
