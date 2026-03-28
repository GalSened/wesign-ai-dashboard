#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { WeSignClient } from './wesign-client.js';
import { AuthTools } from './tools/auth-tools.js';
import { DocumentTools } from './tools/document-tools.js';
import { SigningTools } from './tools/signing-tools.js';
import { TemplateAdminTools } from './tools/template-admin-tools.js';
import { MultiPartyTools } from './tools/multi-party-tools.js';
import { ContactTools } from './tools/contact-tools.js';
import { WeSignResources } from './resources.js';
import type { WeSignConfig } from './types.js';

class WeSignMCPServer {
  private server: Server;
  private client: WeSignClient;
  private authTools: AuthTools;
  private documentTools: DocumentTools;
  private signingTools: SigningTools;
  private templateAdminTools: TemplateAdminTools;
  private multiPartyTools: MultiPartyTools;
  private contactTools: ContactTools;
  private resources: WeSignResources;

  constructor() {
    // Initialize server
    this.server = new Server(
      {
        name: 'wesign-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    // Get configuration from environment or defaults
    const config: WeSignConfig = {
      apiUrl: process.env.WESIGN_API_URL || 'https://wse.comsigntrust.com',
      email: process.env.WESIGN_EMAIL,
      password: process.env.WESIGN_PASSWORD,
      persistent: process.env.WESIGN_PERSISTENT === 'true'
    };

    // Initialize WeSign client and tool handlers
    this.client = new WeSignClient(config);
    this.authTools = new AuthTools(this.client);
    this.documentTools = new DocumentTools(this.client);
    this.signingTools = new SigningTools(this.client);
    this.templateAdminTools = new TemplateAdminTools(this.client);
    this.multiPartyTools = new MultiPartyTools(this.client);
    this.contactTools = new ContactTools(this.client);
    this.resources = new WeSignResources();

    this.setupHandlers();

    // Auto-login if credentials are provided
    if (config.email && config.password) {
      // Run auto-login asynchronously after server starts
      setTimeout(() => {
        this.autoLogin(config.email!, config.password!, config.persistent || false);
      }, 1000);
    }
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const allTools = [
        ...this.authTools.getTools(),
        ...this.documentTools.getTools(),
        ...this.signingTools.getTools(),
        ...this.templateAdminTools.getTools(),
        ...this.templateAdminTools.getSimpleTools(),
        ...this.multiPartyTools.getTools(),
        ...this.contactTools.getTools()
      ];

      return {
        tools: allTools,
      };
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: this.resources.getResourcesList()
      };
    });

    // Read resource content
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const content = await this.resources.getResourceContent(request.params.uri);
      return {
        contents: [{
          uri: request.params.uri,
          mimeType: 'text/markdown',
          text: content
        }]
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result;

        // Route to appropriate tool handler
        if (name.startsWith('wesign_login') || name.startsWith('wesign_logout') || name.startsWith('wesign_refresh')) {
          result = await this.authTools.executeAuthTool(name, args || {});
        } else if (name.startsWith('wesign_upload') || name.startsWith('wesign_create_document') ||
                   name.startsWith('wesign_get_document') || name.startsWith('wesign_list_documents') ||
                   name.startsWith('wesign_download')) {
          result = await this.documentTools.executeDocumentTool(name, args || {});
        } else if (name.startsWith('wesign_create_self') || name.startsWith('wesign_add_signature') ||
                   name.startsWith('wesign_complete_signing') || name.startsWith('wesign_save_draft') ||
                   name.startsWith('wesign_decline_document') || name.startsWith('wesign_get_signing_status')) {
          result = await this.signingTools.executeSigningTool(name, args || {});
        } else if (name.startsWith('wesign_create_template') || name.startsWith('wesign_list_templates') ||
                   name.startsWith('wesign_get_template') || name.startsWith('wesign_use_template') ||
                   name.startsWith('wesign_update_template') || name.startsWith('wesign_get_user') ||
                   name.startsWith('wesign_update_user') || name.startsWith('wesign_extract_signers') ||
                   name.startsWith('wesign_check_auth') || name.startsWith('wesign_send_document_for_signing')) {
          result = await this.templateAdminTools.executeTemplateAdminTool(name, args || {});
        } else if (name.startsWith('wesign_send_for_signature') || name.startsWith('wesign_send_simple') ||
                   name.startsWith('wesign_resend') || name.startsWith('wesign_replace_signer') ||
                   name.startsWith('wesign_cancel') || name.startsWith('wesign_reactivate') ||
                   name.startsWith('wesign_share') || name.startsWith('wesign_get_signer')) {
          result = await this.multiPartyTools.executeMultiPartyTool(name, args || {});
        } else if (name.startsWith('wesign_create_contact') || name.startsWith('wesign_list_contact') ||
                   name.startsWith('wesign_get_contact') || name.startsWith('wesign_update_contact') ||
                   name.startsWith('wesign_delete_contact')) {
          result = await this.contactTools.executeContactTool(name, args || {});
        } else {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  private async autoLogin(email: string, password: string, persistent: boolean) {
    try {
      console.error(`Attempting auto-login for ${email}...`);
      const result = await this.client.login(email, password, persistent);

      if (result.success) {
        console.error('Auto-login successful');
        try {
          const user = await this.client.getCurrentUser();
          console.error(`Logged in as: ${user.name} (${user.email})`);
          console.error(`Company: ${user.companyName}`);
          console.error(`Remaining documents: ${user.program.remainingDocumentsForMonth}`);
        } catch (userError) {
          console.error('Could not retrieve user details after login');
        }
      } else {
        console.error('Auto-login failed:', result.message);
      }
    } catch (error: any) {
      console.error('Auto-login error:', (error as any).message || error);
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('WeSign MCP Server started');
  }
}

// Start the server
const server = new WeSignMCPServer();
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});