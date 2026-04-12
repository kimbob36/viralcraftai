import { type ActionFunctionArgs } from '@remix-run/node';

import { createScopedLogger } from '~/utils/logger';
import { MCPService } from '~/lib/.server/mcpService';
import type { MCPConfig } from '~/lib/mcp/mcpConfig';

const logger = createScopedLogger('api.mcp-update-config');

export async function action({ request }: ActionFunctionArgs) {
  try {
    const mcpConfig = (await request.json()) as MCPConfig;

    if (!mcpConfig || typeof mcpConfig !== 'object') {
      return Response.json({ error: 'Invalid MCP servers configuration' }, { status: 400 });
    }

    const mcpService = MCPService.getInstance();
    const serverTools = await mcpService.updateConfig(mcpConfig);

    return Response.json(serverTools);
  } catch (error) {
    logger.error('Error updating MCP servers configuration:', error);

    return Response.json({ error: 'Failed to update MCP servers configuration' }, { status: 500 });
  }
}
