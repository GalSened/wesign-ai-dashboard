import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { WeSignClient } from './wesign-client.js';
import { AuthTools } from './tools/auth-tools.js';
import { DocumentTools } from './tools/document-tools.js';
import { SigningTools } from './tools/signing-tools.js';
import { TemplateAdminTools } from './tools/template-admin-tools.js';
import { MultiPartyTools } from './tools/multi-party-tools.js';
import { ContactTools } from './tools/contact-tools.js';
import { SmartFieldTools } from './tools/smart-field-tools.js';

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// API Key authentication (optional)
const API_KEY = process.env.API_KEY;
if (API_KEY) {
  app.use((req, res, next) => {
    if (req.path === '/health') return next();

    const apiKey = req.headers['x-api-key'];
    if (apiKey !== API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });
}

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
const contactTools = new ContactTools(client);
const smartFieldTools = new SmartFieldTools(client);

// Auto-login if credentials provided
if (config.email && config.password) {
  client.login(config.email, config.password, config.persistent || false)
    .then(() => {
      console.log('Auto-login successful');
    })
    .catch((error) => {
      console.error('Auto-login failed:', error.message);
    });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    authenticated: client.isAuthenticated(),
    timestamp: new Date().toISOString()
  });
});

// List all available tools
app.get('/tools', (req, res) => {
  const allTools = [
    ...authTools.getTools(),
    ...documentTools.getTools(),
    ...signingTools.getTools(),
    ...templateAdminTools.getTools(),
    ...templateAdminTools.getSimpleTools(),
    ...multiPartyTools.getTools(),
    ...contactTools.getTools(),
    ...smartFieldTools.getTools()
  ];

  res.json({
    success: true,
    count: allTools.length,
    tools: allTools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema || { type: 'object', properties: {} }
    }))
  });
});

// Execute tool endpoint
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
      await client.login(config.email, config.password, config.persistent || false);
    }

    // Exact-match routing map — eliminates all prefix collision bugs
    const routes: Record<string, () => Promise<any>> = {
      // Auth
      wesign_login: () => authTools.executeAuthTool(tool, parameters || {}),
      wesign_logout: () => authTools.executeAuthTool(tool, parameters || {}),
      wesign_refresh_token: () => authTools.executeAuthTool(tool, parameters || {}),
      // Documents
      wesign_upload_document: () => documentTools.executeDocumentTool(tool, parameters || {}),
      wesign_create_document_collection: () => documentTools.executeDocumentTool(tool, parameters || {}),
      wesign_get_document_info: () => documentTools.executeDocumentTool(tool, parameters || {}),
      wesign_list_documents: () => documentTools.executeDocumentTool(tool, parameters || {}),
      wesign_download_document: () => documentTools.executeDocumentTool(tool, parameters || {}),
      wesign_search_documents: () => documentTools.executeDocumentTool(tool, parameters || {}),
      wesign_merge_documents: () => documentTools.executeDocumentTool(tool, parameters || {}),
      // Self-signing (uses documentCollectionId + documentId)
      wesign_create_self_sign: () => signingTools.executeSigningTool(tool, parameters || {}),
      wesign_add_signature_fields: () => signingTools.executeSigningTool(tool, parameters || {}),
      wesign_add_fields_by_position: () => signingTools.executeSigningTool(tool, parameters || {}),
      wesign_complete_signing: () => signingTools.executeSigningTool(tool, parameters || {}),
      wesign_save_draft: () => signingTools.executeSigningTool(tool, parameters || {}),
      wesign_decline_document: () => signingTools.executeSigningTool(tool, parameters || {}),
      wesign_get_signing_status: () => signingTools.executeSigningTool(tool, parameters || {}),
      // Smart fields (uses templateId)
      wesign_add_field_smart: () => smartFieldTools.executeSmartFieldTool(tool, parameters || {}),
      wesign_add_signature_preset: () => smartFieldTools.executeSmartFieldTool(tool, parameters || {}),
      // Templates & Admin
      wesign_create_template: () => templateAdminTools.executeTemplateAdminTool(tool, parameters || {}),
      wesign_list_templates: () => templateAdminTools.executeTemplateAdminTool(tool, parameters || {}),
      wesign_get_template: () => templateAdminTools.executeTemplateAdminTool(tool, parameters || {}),
      wesign_use_template: () => templateAdminTools.executeTemplateAdminTool(tool, parameters || {}),
      wesign_update_template_fields: () => templateAdminTools.executeTemplateAdminTool(tool, parameters || {}),
      wesign_get_user_info: () => templateAdminTools.executeTemplateAdminTool(tool, parameters || {}),
      wesign_update_user_info: () => templateAdminTools.executeTemplateAdminTool(tool, parameters || {}),
      wesign_extract_signers_from_excel: () => templateAdminTools.executeTemplateAdminTool(tool, parameters || {}),
      wesign_check_auth_status: () => templateAdminTools.executeTemplateAdminTool(tool, parameters || {}),
      wesign_send_document_for_signing: () => templateAdminTools.executeTemplateAdminTool(tool, parameters || {}),
      // Multi-party signing
      wesign_send_for_signature: () => multiPartyTools.executeMultiPartyTool(tool, parameters || {}),
      wesign_send_simple_document: () => multiPartyTools.executeMultiPartyTool(tool, parameters || {}),
      wesign_resend_to_signer: () => multiPartyTools.executeMultiPartyTool(tool, parameters || {}),
      wesign_replace_signer: () => multiPartyTools.executeMultiPartyTool(tool, parameters || {}),
      wesign_cancel_document: () => multiPartyTools.executeMultiPartyTool(tool, parameters || {}),
      wesign_reactivate_document: () => multiPartyTools.executeMultiPartyTool(tool, parameters || {}),
      wesign_share_document: () => multiPartyTools.executeMultiPartyTool(tool, parameters || {}),
      wesign_get_signer_link: () => multiPartyTools.executeMultiPartyTool(tool, parameters || {}),
      // New v5.1 document tools
      wesign_delete_document: () => documentTools.executeDocumentTool(tool, parameters || {}),
      wesign_delete_documents_batch: () => documentTools.executeDocumentTool(tool, parameters || {}),
      wesign_get_page_count: () => documentTools.executeDocumentTool(tool, parameters || {}),
      wesign_get_signing_links: () => documentTools.executeDocumentTool(tool, parameters || {}),
      wesign_export_pdf_fields: () => documentTools.executeDocumentTool(tool, parameters || {}),
      wesign_get_usage_report: () => documentTools.executeDocumentTool(tool, parameters || {}),
      // New v5.1 template tools
      wesign_delete_template: () => templateAdminTools.executeTemplateAdminTool(tool, parameters || {}),
      wesign_duplicate_template: () => templateAdminTools.executeTemplateAdminTool(tool, parameters || {}),
      // New v5.1 multi-party tools
      wesign_bulk_send: () => multiPartyTools.executeMultiPartyTool(tool, parameters || {}),
      // Contacts
      wesign_create_contact: () => contactTools.executeContactTool(tool, parameters || {}),
      wesign_create_contacts_bulk: () => contactTools.executeContactTool(tool, parameters || {}),
      wesign_list_contacts: () => contactTools.executeContactTool(tool, parameters || {}),
      wesign_get_contact: () => contactTools.executeContactTool(tool, parameters || {}),
      wesign_update_contact: () => contactTools.executeContactTool(tool, parameters || {}),
      wesign_delete_contact: () => contactTools.executeContactTool(tool, parameters || {}),
      wesign_delete_contacts_batch: () => contactTools.executeContactTool(tool, parameters || {}),
      wesign_list_contact_groups: () => contactTools.executeContactTool(tool, parameters || {}),
      wesign_get_contact_group: () => contactTools.executeContactTool(tool, parameters || {}),
      wesign_create_contact_group: () => contactTools.executeContactTool(tool, parameters || {}),
      wesign_update_contact_group: () => contactTools.executeContactTool(tool, parameters || {}),
      wesign_delete_contact_group: () => contactTools.executeContactTool(tool, parameters || {}),
    };

    const handler = routes[tool];
    if (!handler) {
      return res.status(404).json({ success: false, error: `Unknown tool: ${tool}` });
    }

    let result = await handler();

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

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`WeSign MCP Server listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Tools list: http://localhost:${PORT}/tools`);
  console.log(`Execute endpoint: http://localhost:${PORT}/execute`);
});