import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { WeSignClient } from './wesign-client.js';
import { AuthTools } from './tools/auth-tools.js';
import { DocumentTools } from './tools/document-tools.js';
import { SigningTools } from './tools/signing-tools.js';
import { TemplateAdminTools } from './tools/template-admin-tools.js';
import { MultiPartyTools } from './tools/multi-party-tools.js';
import { SmartFieldTools } from './tools/smart-field-tools.js';

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Initialize WeSign client
const config = {
  apiUrl: process.env.WESIGN_API_URL || 'https://wse.comsigntrust.com',
  email: process.env.WESIGN_EMAIL,
  password: process.env.WESIGN_PASSWORD,
  persistent: process.env.WESIGN_PERSISTENT === 'true'
};

const client = new WeSignClient(config);
const authTools = new AuthTools(client);
const documentTools = new DocumentTools(client);
const signingTools = new SigningTools(client);
const templateAdminTools = new TemplateAdminTools(client);
const multiPartyTools = new MultiPartyTools(client);
const smartFieldTools = new SmartFieldTools(client);

// Auto-login
if (config.email && config.password) {
  client.login(config.email, config.password, config.persistent || false)
    .then(() => {
      console.log('MCP SSE Server: Auto-login successful');
      console.log('MCP SSE Server: Authenticated:', client.isAuthenticated());
    })
    .catch((error) => console.error('MCP SSE Server: Auto-login failed:', error.message));
}

// Store active transports by session ID
const activeTransports = new Map<string, SSEServerTransport>();

// Helper function to create and setup MCP server with transport
function createMCPServer(transport: SSEServerTransport): Server {
  const mcpServer = new Server({
    name: 'wesign-mcp-server',
    version: '1.0.0',
  }, {
    capabilities: {
      tools: {},
    },
  });

  // Get all tools
  const allTools = [
    ...authTools.getTools(),
    ...documentTools.getTools(),
    ...signingTools.getTools(),
    ...templateAdminTools.getTools(),
    ...templateAdminTools.getSimpleTools(),
    ...multiPartyTools.getTools(),
    ...smartFieldTools.getTools()
  ];

  // Setup request handlers
  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: allTools };
  });

  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result;

      // Route to appropriate tool handler
      if (name.startsWith('wesign_login') || name.startsWith('wesign_logout') || name.startsWith('wesign_refresh')) {
        result = await authTools.executeAuthTool(name, args || {});
      }
      else if (name.startsWith('wesign_upload') || name.startsWith('wesign_create_document') ||
        name.startsWith('wesign_get_document') || name.startsWith('wesign_list_documents') ||
        name.startsWith('wesign_download')) {
        result = await documentTools.executeDocumentTool(name, args || {});
      }
      else if (name.startsWith('wesign_create_self') || name.startsWith('wesign_add_signature') ||
        name.startsWith('wesign_complete_signing') || name.startsWith('wesign_save_draft') ||
        name.startsWith('wesign_decline_document') || name.startsWith('wesign_get_signing_status')) {
        result = await signingTools.executeSigningTool(name, args || {});
      }
      else if (name.startsWith('wesign_create_template') || name.startsWith('wesign_list_templates') ||
        name.startsWith('wesign_get_template') || name.startsWith('wesign_use_template') ||
        name.startsWith('wesign_update_template') || name.startsWith('wesign_get_user') ||
        name.startsWith('wesign_update_user') || name.startsWith('wesign_extract_signers') ||
        name.startsWith('wesign_check_auth') || name.startsWith('wesign_send_document_for_signing')) {
        result = await templateAdminTools.executeTemplateAdminTool(name, args || {});
      }
      else if (name.startsWith('wesign_send_for_signature') || name.startsWith('wesign_send_simple') ||
        name.startsWith('wesign_resend') || name.startsWith('wesign_replace_signer') ||
        name.startsWith('wesign_cancel') || name.startsWith('wesign_reactivate') ||
        name.startsWith('wesign_share') || name.startsWith('wesign_get_signer')) {
        result = await multiPartyTools.executeMultiPartyTool(name, args || {});
      }
      else if (name.startsWith('wesign_add_field_smart') || name.startsWith('wesign_add_signature_preset')) {
        result = await smartFieldTools.executeSmartFieldTool(name, args || {});
      }
      else {
        throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (error: any) {
      throw new Error(`Tool execution failed: ${error.message}`);
    }
  });

  // Connect transport to server
  mcpServer.connect(transport);

  // Handle transport close
  transport.onclose = () => {
    console.log('SSE transport closed for session:', transport.sessionId);
    activeTransports.delete(transport.sessionId);
  };

  transport.onerror = (error) => {
    console.error('SSE transport error:', error);
    activeTransports.delete(transport.sessionId);
  };

  return mcpServer;
}

// MCP SSE endpoint - GET establishes SSE connection
app.get('/mcp', async (req, res) => {
  console.log('New SSE connection request');

  try {
    // Create SSE transport
    const transport = new SSEServerTransport('/mcp/message', res);

    // Store transport first
    activeTransports.set(transport.sessionId, transport);

    console.log('SSE connection established, session:', transport.sessionId);

    // Create and setup MCP server (connect() automatically calls transport.start())
    const mcpServer = createMCPServer(transport);

  } catch (error: any) {
    console.error('SSE connection error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// MCP message endpoint - POST sends messages
app.post('/mcp/message', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing session ID' });
    }

    const transport = activeTransports.get(sessionId);

    if (!transport) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await transport.handlePostMessage(req, res);
  } catch (error: any) {
    console.error('Message handling error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    authenticated: client.isAuthenticated(),
    protocol: 'MCP SSE',
    activeSessions: activeTransports.size,
    timestamp: new Date().toISOString()
  });
});

// Server info endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'WeSign MCP Server',
    version: '1.0.0',
    protocol: 'MCP SSE',
    transport: 'Server-Sent Events',
    mcp_endpoint: '/mcp',
    message_endpoint: '/mcp/message',
    capabilities: {
      tools: true,
      mcp: true
    },
    tools_count: 34,
    activeSessions: activeTransports.size
  });
});

// REST API endpoint (for ChatGPT Plus Custom GPT Actions)
app.post('/execute', async (req, res) => {
  try {
    const { tool, parameters } = req.body;

    if (!tool) {
      return res.status(400).json({
        success: false,
        error: 'Tool name is required'
      });
    }

    // Auto-login if not authenticated
    if (!client.isAuthenticated() && config.email && config.password) {
      console.log('REST endpoint: Attempting auto-login...');
      try {
        await client.login(config.email, config.password, config.persistent || false);
        console.log('REST endpoint: Auto-login successful, authenticated:', client.isAuthenticated());
      } catch (error: any) {
        console.error('REST endpoint: Auto-login failed:', error.message);
        throw error;
      }
    }

    let result;

    // Route to appropriate tool handler
    if (tool.startsWith('wesign_login') || tool.startsWith('wesign_logout') || tool.startsWith('wesign_refresh')) {
      result = await authTools.executeAuthTool(tool, parameters || {});
    }
    else if (tool.startsWith('wesign_upload') || tool.startsWith('wesign_create_document') ||
      tool.startsWith('wesign_get_document') || tool.startsWith('wesign_list_documents') ||
      tool.startsWith('wesign_download')) {
      result = await documentTools.executeDocumentTool(tool, parameters || {});
    }
    else if (tool.startsWith('wesign_create_self') || tool.startsWith('wesign_add_signature') ||
      tool.startsWith('wesign_complete_signing') || tool.startsWith('wesign_save_draft') ||
      tool.startsWith('wesign_decline_document') || tool.startsWith('wesign_get_signing_status')) {
      result = await signingTools.executeSigningTool(tool, parameters || {});
    }
    else if (tool.startsWith('wesign_create_template') || tool.startsWith('wesign_list_templates') ||
      tool.startsWith('wesign_get_template') || tool.startsWith('wesign_use_template') ||
      tool.startsWith('wesign_update_template') || tool.startsWith('wesign_get_user') ||
      tool.startsWith('wesign_update_user') || tool.startsWith('wesign_extract_signers') ||
      tool.startsWith('wesign_check_auth') || tool.startsWith('wesign_send_document_for_signing')) {
      result = await templateAdminTools.executeTemplateAdminTool(tool, parameters || {});
    }
    else if (tool.startsWith('wesign_send_for_signature') || tool.startsWith('wesign_send_simple') ||
      tool.startsWith('wesign_resend') || tool.startsWith('wesign_replace_signer') ||
      tool.startsWith('wesign_cancel') || tool.startsWith('wesign_reactivate') ||
      tool.startsWith('wesign_share') || tool.startsWith('wesign_get_signer')) {
      result = await multiPartyTools.executeMultiPartyTool(tool, parameters || {});
    }
    else if (tool.startsWith('wesign_add_field_smart') || tool.startsWith('wesign_add_signature_preset')) {
      result = await smartFieldTools.executeSmartFieldTool(tool, parameters || {});
    }
    else {
      return res.status(404).json({
        success: false,
        error: `Unknown tool: ${tool}`
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Tool execution error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Tool execution failed'
    });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`WeSign MCP SSE Server listening on port ${PORT}`);
  console.log(`MCP SSE endpoint: http://localhost:${PORT}/mcp`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Server info: http://localhost:${PORT}/`);
});
