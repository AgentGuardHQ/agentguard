// Analytics tools — advanced analytics available in AgentGuard Cloud.

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const CLOUD_MESSAGE =
  'Advanced analytics are available in AgentGuard Cloud. Visit https://agentguard.dev';

export function registerAnalyticsTools(server: McpServer): void {
  // analyze_violations — stub pointing to cloud
  server.tool(
    'analyze_violations',
    'Analyze violation patterns (available in AgentGuard Cloud)',
    {
      baseDir: z.string().optional().default('.agentguard').describe('Base directory (unused)'),
    },
    async () => ({
      content: [{ type: 'text' as const, text: CLOUD_MESSAGE }],
    })
  );

  // risk_scores — stub pointing to cloud
  server.tool(
    'risk_scores',
    'Compute per-session governance risk scores (available in AgentGuard Cloud)',
    {
      baseDir: z.string().optional().default('.agentguard').describe('Base directory (unused)'),
    },
    async () => ({
      content: [{ type: 'text' as const, text: CLOUD_MESSAGE }],
    })
  );

  // suggest_rules — stub pointing to cloud
  server.tool(
    'suggest_rules',
    'Generate policy rule suggestions (available in AgentGuard Cloud)',
    {
      baseDir: z.string().optional().default('.agentguard').describe('Base directory (unused)'),
    },
    async () => ({
      content: [{ type: 'text' as const, text: CLOUD_MESSAGE }],
    })
  );
}
