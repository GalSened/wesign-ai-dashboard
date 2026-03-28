import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
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

// Initialize WeSign MCP Server
const config = {
  apiUrl: process.env.WESIGN_API_URL || 'https://wse.comsigntrust.com',
  email: process.env.WESIGN_EMAIL,
  password: process.env.WESIGN_PASSWORD,
  persistent: process.env.WESIGN_PERSISTENT === 'true'
};

const mcpServer = new Server({
  name: 'wesign-mcp-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

const client = new WeSignClient(config);
const authTools = new AuthTools(client);
const documentTools = new DocumentTools(client);
const signingTools = new SigningTools(client);
const templateAdminTools = new TemplateAdminTools(client);
const multiPartyTools = new MultiPartyTools(client);
const smartFieldTools = new SmartFieldTools(client);

// Auto-login with better logging
if (config.email && config.password) {
  client.login(config.email, config.password, config.persistent || false)
    .then(() => {
      console.log('MCP HTTP Server: Auto-login successful');
      console.log('MCP HTTP Server: Authenticated:', client.isAuthenticated());
    })
    .catch((error) => console.error('MCP HTTP Server: Auto-login failed:', error.message));
}

// Setup MCP handlers
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  const allTools = [
    ...authTools.getTools(),
    ...documentTools.getTools(),
    ...signingTools.getTools(),
    ...templateAdminTools.getTools(),
    ...templateAdminTools.getSimpleTools(),
    ...multiPartyTools.getTools(),
    ...smartFieldTools.getTools()
  ];

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
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }],
    };
  } catch (error: any) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error.message}`);
  }
});

// MCP HTTP endpoint - handles JSON-RPC over HTTP
app.post('/mcp', async (req, res) => {
  try {
    const { jsonrpc, id, method, params } = req.body;

    if (jsonrpc !== '2.0') {
      return res.status(400).json({
        jsonrpc: '2.0',
        id: id || null,
        error: {
          code: -32600,
          message: 'Invalid Request: jsonrpc must be "2.0"'
        }
      });
    }

    // Handle MCP protocol methods
    if (method === 'tools/list') {
      const response = await mcpServer.request(
        { method: 'tools/list', params: params || {} },
        ListToolsRequestSchema
      );

      return res.json({
        jsonrpc: '2.0',
        id,
        result: response
      });
    }

    if (method === 'tools/call') {
      const response = await mcpServer.request(
        { method: 'tools/call', params },
        CallToolRequestSchema
      );

      return res.json({
        jsonrpc: '2.0',
        id,
        result: response
      });
    }

    return res.status(400).json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `Method not found: ${method}`
      }
    });

  } catch (error: any) {
    console.error('MCP request error:', error);
    return res.status(500).json({
      jsonrpc: '2.0',
      id: req.body.id || null,
      error: {
        code: -32603,
        message: error.message || 'Internal error'
      }
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    authenticated: client.isAuthenticated(),
    protocol: 'MCP HTTP',
    timestamp: new Date().toISOString()
  });
});

// Tools list endpoint (for orchestrator and other clients)
app.get('/tools', async (req, res) => {
  try {
    const allTools = [
      ...authTools.getTools(),
      ...documentTools.getTools(),
      ...signingTools.getTools(),
      ...templateAdminTools.getTools(),
      ...templateAdminTools.getSimpleTools(),
      ...multiPartyTools.getTools(),
      ...smartFieldTools.getTools()
    ];

    res.json({
      success: true,
      tools: allTools,
      count: allTools.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error listing tools:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list tools'
    });
  }
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
    } else {
      console.log('REST endpoint: Already authenticated:', client.isAuthenticated());
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

// Server info endpoint (for ChatGPT connector discovery)
app.get('/', (req, res) => {
  res.json({
    name: 'WeSign MCP Server',
    version: '1.0.0',
    protocol: 'MCP + REST',
    transport: 'HTTP',
    mcp_endpoint: '/mcp',
    rest_endpoint: '/execute',
    capabilities: {
      tools: true,
      mcp: true,
      rest: true
    },
    tools_count: 34
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`WeSign MCP HTTP Server listening on port ${PORT}`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Server info: http://localhost:${PORT}/`);
});
// Serve OpenAPI spec for ChatGPT Custom GPT Actions
app.get('/openapi-chatgpt.yaml', (req, res) => {
  const yaml = `openapi: 3.1.0
info:
  title: WeSign Digital Signature API
  description: Digital signature and document management with beautiful visual widgets
  version: 2.0.0
servers:
  - url: ${req.protocol}://${req.get('host')}
    description: WeSign Server

paths:
  /execute:
    post:
      operationId: executeWeSignTool
      summary: Execute any WeSign tool
      description: Execute WeSign tools like listing documents, templates, sending for signature, etc.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: ["tool"]
              properties:
                tool:
                  type: string
                  description: "Tool name (e.g., wesign_get_user_info, wesign_list_documents)"
                parameters:
                  type: object
                  description: "Tool-specific parameters"
                  additionalProperties: true
      responses:
        '200':
          description: Successful tool execution
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: object

  /health:
    get:
      operationId: healthCheck
      summary: Check server health
      responses:
        '200':
          description: Server is healthy`;

  res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.send(yaml);
});

