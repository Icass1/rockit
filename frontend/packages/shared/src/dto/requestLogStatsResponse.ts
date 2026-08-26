// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { RequestLogTopIpSchema } from './requestLogTopIp';
import { RequestLogUserActivitySchema } from './requestLogUserActivity';
import { RequestLogLatencyPercentilesSchema } from './requestLogLatencyPercentiles';
import { RequestLogRouteStatsSchema } from './requestLogRouteStats';
import { RequestLogCodeDistributionSchema } from './requestLogCodeDistribution';
import { RequestLogDailyStatsSchema } from './requestLogDailyStats';
import { RequestLogHourlyStatsSchema } from './requestLogHourlyStats';
import { RequestLogTimeSeriesPointSchema } from './requestLogTimeSeriesPoint';
import { RequestLogMethodDistributionSchema } from './requestLogMethodDistribution';

export const RequestLogStatsResponseSchema = z.object({
    totalRequests: z.number(),
    timeSeries: z.array(z.lazy(() => RequestLogTimeSeriesPointSchema)),
    routeStats: z.array(z.lazy(() => RequestLogRouteStatsSchema)),
    topIps: z.array(z.lazy(() => RequestLogTopIpSchema)),
    codeDistribution: z.array(z.lazy(() => RequestLogCodeDistributionSchema)),
    methodDistribution: z.array(z.lazy(() => RequestLogMethodDistributionSchema)),
    userActivity: z.array(z.lazy(() => RequestLogUserActivitySchema)),
    hourlyStats: z.array(z.lazy(() => RequestLogHourlyStatsSchema)),
    dailyStats: z.array(z.lazy(() => RequestLogDailyStatsSchema)),
    latencyPercentiles: z.lazy(() => RequestLogLatencyPercentilesSchema),
    averageTimeMs: z.number(),
    averageRequestsPerDay: z.number(),
});

export type RequestLogStatsResponse = z.infer<typeof RequestLogStatsResponseSchema>;