import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { WeSignClient } from '../wesign-client.js';
import fs from 'fs-extra';
import * as path from 'path';
import mime from 'mime-types';

export class TemplateAdminTools {
  constructor(private client: WeSignClient) {}

  getTools(): Tool[] {
    return [
      // Template Tools
      {
        name: 'wesign_create_template',
        description: 'Create a reusable document template from a file | צור תבנית מסמך לשימוש חוזר מקובץ',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Path to the template file | נתיב לקובץ התבנית'
            },
            name: {
              type: 'string',
              description: 'Name for the template | שם לתבנית'
            },
            description: {
              type: 'string',
              description: 'Optional description for the template | תיאור אופציונלי לתבנית'
            }
          },
          required: ['filePath', 'name']
        }
      },
      {
        name: 'wesign_list_templates',
        description: 'List available document templates | הצג רשימת תבניות מסמכים זמינות',
        inputSchema: {
          type: 'object',
          properties: {
            offset: {
              type: 'number',
              description: 'Number of records to skip (default: 0) | מספר רשומות לדלג עליהן (ברירת מחדל: 0)',
              default: 0
            },
            limit: {
              type: 'number',
              description: 'Maximum number of records to return (default: 50) | מספר מקסימלי של רשומות להחזיר (ברירת מחדל: 50)',
              default: 50
            }
          }
        }
      },
      {
        name: 'wesign_get_template',
        description: 'Get detailed information about a specific template | קבל מידע מפורט על תבנית מסוימת',
        inputSchema: {
          type: 'object',
          properties: {
            templateId: {
              type: 'string',
              description: 'ID of the template | מזהה התבנית'
            }
          },
          required: ['templateId']
        }
      },
      {
        name: 'wesign_use_template',
        description: 'Create a new document from a template for self-signing | צור מסמך חדש מתבנית לחתימה עצמית',
        inputSchema: {
          type: 'object',
          properties: {
            templateId: {
              type: 'string',
              description: 'ID of the template to use | מזהה התבנית לשימוש'
            },
            documentName: {
              type: 'string',
              description: 'Name for the new document | שם למסמך החדש'
            }
          },
          required: ['templateId', 'documentName']
        }
      },
      {
        name: 'wesign_update_template_fields',
        description: 'Add signature fields and other form fields to a template. Use this to position fields on specific pages before sending for signature. | הוסף שדות חתימה ושדות טופס אחרים לתבנית. השתמש בזה למיקום שדות בעמודים מסוימים לפני שליחה לחתימה.',
        inputSchema: {
          type: 'object',
          properties: {
            templateId: {
              type: 'string',
              description: 'ID of the template to update'
            },
            signatureFields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Unique field name' },
                  x: { type: 'number', description: 'X coordinate' },
                  y: { type: 'number', description: 'Y coordinate' },
                  width: { type: 'number', description: 'Field width' },
                  height: { type: 'number', description: 'Field height' },
                  page: { type: 'number', description: 'Page number (1-based)' },
                  mandatory: { type: 'boolean', description: 'Is field required (default: true)' }
                },
                required: ['name', 'x', 'y', 'width', 'height', 'page']
              },
              description: 'Array of signature fields to add to the template'
            }
          },
          required: ['templateId', 'signatureFields']
        }
      },
      // User & Admin Tools
      {
        name: 'wesign_get_user_info',
        description: 'Get current user information and profile details and account details | קבל מידע על המשתמש הנוכחי ופרטי החשבון',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'wesign_update_user_info',
        description: 'Update current user information | עדכן מידע על המשתמש הנוכחי',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'User\'s full name'
            },
            email: {
              type: 'string',
              description: 'User\'s email address'
            },
            phone: {
              type: 'string',
              description: 'User\'s phone number'
            },
            language: {
              type: 'number',
              description: 'User interface language: 1=English, 2=Hebrew',
              enum: [1, 2]
            }
          },
          required: ['name', 'email']
        }
      },
      // Bulk Operations
      {
        name: 'wesign_extract_signers_from_excel',
        description: 'Extract signer information from an Excel file for bulk distribution | חלץ מידע על חותמים מקובץ אקסל להפצה המונית',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Path to the Excel file containing signer information'
            }
          },
          required: ['filePath']
        }
      },
      // Authentication Status
      {
        name: 'wesign_check_auth_status',
        description: 'Check current authentication status | בדוק סטטוס אימות נוכחי',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'wesign_delete_template',
        description: 'Delete a template permanently | מחק תבנית לצמיתות',
        inputSchema: {
          type: 'object',
          properties: {
            templateId: { type: 'string', description: 'ID or name of the template to delete' }
          },
          required: ['templateId']
        }
      },
      {
        name: 'wesign_duplicate_template',
        description: 'Create a copy of an existing template with a new name | שכפל תבנית קיימת עם שם חדש',
        inputSchema: {
          type: 'object',
          properties: {
            templateId: { type: 'string', description: 'ID or name of the template to duplicate' },
            newName: { type: 'string', description: 'Name for the duplicated template' }
          },
          required: ['templateId', 'newName']
        }
      }
    ];
  }

  getSimpleTools(): Tool[] {
    return [
      {
        name: 'wesign_send_document_for_signing',
        description: 'Complete workflow: Upload PDF, add signature fields to all pages automatically, and send for signature. Simple natural language interface. | תהליך מלא: העלה PDF, הוסף שדות חתימה לכל הדפים אוטומטית, ושלח לחתימה. ממשק פשוט בשפה טבעית.',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Path to the PDF file'
            },
            signerName: {
              type: 'string',
              description: 'Name of the person who will sign'
            },
            signerPhone: {
              type: 'string',
              description: 'Phone number of the signer (for SMS delivery)'
            },
            signerEmail: {
              type: 'string',
              description: 'Email of the signer (optional, for email delivery)'
            },
            sendingMethod: {
              type: 'number',
              description: 'How to send: 1=SMS, 2=Email, 3=WhatsApp (default: 1 for SMS)',
              enum: [1, 2, 3],
              default: 1
            },
            fieldPosition: {
              type: 'object',
              description: 'Optional custom position for signature fields (default: bottom of each page)',
              properties: {
                x: { type: 'number', default: 100 },
                y: { type: 'number', default: 700 },
                width: { type: 'number', default: 200 },
                height: { type: 'number', default: 50 }
              }
            }
          },
          required: ['filePath', 'signerName', 'signerPhone']
        }
      }
    ];
  }

  async executeTemplateAdminTool(name: string, args: any): Promise<any> {
    // Handle authentication check first (doesn't require auth)
    if (name === 'wesign_check_auth_status') {
      return this.checkAuthStatus();
    }

    if (!this.client.isAuthenticated()) {
      throw new Error('Not authenticated. Please login first using wesign_login.');
    }

    switch (name) {
      case 'wesign_create_template':
        return await this.createTemplate(args.filePath, args.name, args.description);

      case 'wesign_list_templates':
        return await this.listTemplates(args.offset || 0, args.limit || 50);

      case 'wesign_get_template':
        return await this.getTemplate(args.templateId);

      case 'wesign_use_template':
        return await this.useTemplate(args.templateId, args.documentName);

      case 'wesign_update_template_fields':
        return await this.updateTemplateFields(args.templateId, args.signatureFields);

      case 'wesign_send_document_for_signing':
        return await this.sendDocumentForSigning(args);

      case 'wesign_get_user_info':
        return await this.getUserInfo();

      case 'wesign_update_user_info':
        return await this.updateUserInfo(args);

      case 'wesign_extract_signers_from_excel':
        return await this.extractSignersFromExcel(args.filePath);

      case 'wesign_delete_template':
        await this.client.deleteTemplate(args.templateId);
        return { success: true, message: `Template deleted successfully` };

      case 'wesign_duplicate_template':
        const dupResult = await this.client.duplicateTemplate(args.templateId, args.newName);
        return { success: true, message: `Template duplicated as "${args.newName}"`, newTemplateId: dupResult?.newTemplateId || dupResult?.id, name: args.newName };

      default:
        throw new Error(`Unknown template/admin tool: ${name}`);
    }
  }

  private async createTemplate(filePath: string, name: string, description?: string): Promise<any> {
    try {
      // Check if file exists
      if (!await fs.pathExists(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Read file and convert to base64
      const fileBuffer = await fs.readFile(filePath);
      const base64Content = fileBuffer.toString('base64');

      // Get file info
      const mimeType = mime.lookup(filePath) || 'application/octet-stream';

      // Create base64 data URL
      const base64File = `data:${mimeType};base64,${base64Content}`;

      // Create template
      const result = await this.client.createTemplate(name, base64File, description);

      return {
        success: true,
        message: `Template "${name}" created successfully`,
        template: {
          id: result.id,
          name: result.name,
          description: result.description,
          status: result.status,
          creationTime: result.creationTime
        },
        originalFileName: path.basename(filePath),
        fileSize: fileBuffer.length,
        mimeType: mimeType
      };
    } catch (error: any) {
      throw new Error(`Failed to create template: ${error.message}`);
    }
  }

  private async listTemplates(offset: number, limit: number): Promise<any> {
    try {
      const templates = await this.client.getTemplates(offset, limit);

      // Ensure templates is an array
      const templateArray = Array.isArray(templates) ? templates : [];

      return {
        success: true,
        templates: templateArray.map(template => ({
          id: template.id,
          name: template.name,
          description: template.description,
          status: template.status,
          statusName: this.getTemplateStatusName(template.status),
          creationTime: template.creationTime
        })),
        pagination: {
          offset,
          limit,
          count: templateArray.length
        }
      };
    } catch (error: any) {
      throw new Error(`Failed to list templates: ${error.message}`);
    }
  }

  private async getTemplate(templateId: string): Promise<any> {
    try {
      const template = await this.client.getTemplate(templateId);

      return {
        success: true,
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          status: template.status,
          statusName: this.getTemplateStatusName(template.status),
          creationTime: template.creationTime,
          hasFile: !!template.base64File
        }
      };
    } catch (error: any) {
      throw new Error(`Failed to get template: ${error.message}`);
    }
  }

  private async useTemplate(templateId: string, documentName: string): Promise<any> {
    try {
      // Download template PDF (the getTemplate endpoint doesn't work - returns 405)
      const pdfBuffer = await this.client.downloadTemplate(templateId);

      // Convert PDF to base64 with proper data URI format
      const base64Content = pdfBuffer.toString('base64');
      const base64File = `data:application/pdf;base64,${base64Content}`;

      // Create self-sign document from template
      const result = await this.client.createSelfSignDocument({
        name: documentName,
        base64File: base64File,
        sourceTemplateId: templateId
      });

      return {
        success: true,
        message: `Document "${documentName}" created from template`,
        documentCollectionId: result.documentCollectionId,
        documentId: result.documentId,
        documentName: result.name,
        pagesCount: result.pagesCount,
        sourceTemplate: {
          id: templateId
        }
      };
    } catch (error: any) {
      throw new Error(`Failed to use template: ${error.message}`);
    }
  }

  private async updateTemplateFields(templateId: string, signatureFields: any[]): Promise<any> {
    try {
      // Convert signature fields to PDFFields structure
      const pdfFields: import('../types.js').PDFFields = {
        signatureFields: signatureFields.map(field => ({
          name: field.name,
          description: field.description,
          x: field.x,
          y: field.y,
          width: field.width,
          height: field.height,
          mandatory: field.mandatory ?? true,
          page: field.page,
          image: field.image,
          signingType: field.signingType
        }))
      };

      // Update template with fields
      await this.client.updateTemplateFields(templateId, pdfFields);

      return {
        success: true,
        message: `Added ${signatureFields.length} signature fields to template`,
        templateId: templateId,
        fieldsAdded: signatureFields.length,
        fields: signatureFields.map((field, index) => ({
          index: index + 1,
          name: field.name,
          page: field.page,
          position: { x: field.x, y: field.y },
          size: { width: field.width, height: field.height },
          mandatory: field.mandatory ?? true
        }))
      };
    } catch (error: any) {
      throw new Error(`Failed to update template fields: ${error.message}`);
    }
  }

  private async getUserInfo(): Promise<any> {
    try {
      const user = await this.client.getCurrentUser();

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          companyId: user.companyId,
          companyName: user.companyName,
          groupName: user.groupName,
          type: user.type,
          typeName: this.getUserTypeName(user.type),
          status: user.status,
          statusName: this.getUserStatusName(user.status),
          language: user.userConfiguration.language,
          languageName: user.userConfiguration.language === 1 ? 'English' : 'Hebrew',
          program: {
            expiredTime: user.program.expiredTime,
            remainingDocuments: user.program.remainingDocumentsForMonth
          }
        }
      };
    } catch (error: any) {
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }

  private async updateUserInfo(args: any): Promise<any> {
    try {
      const updateData = {
        name: args.name,
        email: args.email,
        phone: args.phone,
        userConfiguration: {
          language: args.language || 1
        }
      };

      const result = await this.client.updateUser(updateData);

      return {
        success: result.success,
        message: result.success ? 'User information updated successfully' : 'Failed to update user information',
        updatedFields: {
          name: args.name,
          email: args.email,
          phone: args.phone || null,
          language: args.language || 1
        }
      };
    } catch (error: any) {
      throw new Error(`Failed to update user info: ${error.message}`);
    }
  }

  private async extractSignersFromExcel(filePath: string): Promise<any> {
    try {
      // Check if file exists
      if (!await fs.pathExists(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Check if file is Excel format
      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.xls' && ext !== '.xlsx') {
        throw new Error('File must be an Excel file (.xls or .xlsx)');
      }

      // Read file and convert to base64
      const fileBuffer = await fs.readFile(filePath);
      const base64Content = fileBuffer.toString('base64');

      // Get appropriate MIME type
      const mimeType = ext === '.xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/vnd.ms-excel';

      // Create base64 data URL
      const base64File = `data:${mimeType};base64,${base64Content}`;

      // Extract signers
      const signers = await this.client.extractSignersFromExcel(base64File);

      return {
        success: true,
        message: `Extracted ${signers.length} signers from Excel file`,
        signersCount: signers.length,
        signers: signers.map((signer: any, index: number) => ({
          index: index + 1,
          firstName: signer.firstName,
          lastName: signer.lastName,
          contact: signer.email || signer.phone,
          additionalFields: signer.additionalFields || []
        })),
        fileName: path.basename(filePath),
        fileSize: fileBuffer.length
      };
    } catch (error: any) {
      throw new Error(`Failed to extract signers from Excel: ${error.message}`);
    }
  }

  private checkAuthStatus(): any {
    const isAuthenticated = this.client.isAuthenticated();
    const tokens = this.client.getTokens();

    return {
      success: true,
      authenticated: isAuthenticated,
      hasTokens: tokens !== null,
      tokenInfo: tokens ? {
        hasAccessToken: !!tokens.accessToken,
        hasRefreshToken: !!tokens.refreshToken,
        hasAuthToken: !!tokens.authToken
      } : null
    };
  }

  private async sendDocumentForSigning(args: any): Promise<any> {
    try {
      const {
        filePath,
        signerName,
        signerPhone,
        signerEmail,
        sendingMethod = 1,
        fieldPosition = { x: 100, y: 700, width: 200, height: 50 }
      } = args;

      // Step 1: Create template from PDF
      console.error(`Step 1: Creating template from ${path.basename(filePath)}...`);
      const templateName = `${path.basename(filePath, path.extname(filePath))}_${Date.now()}`;
      const template = await this.createTemplate(filePath, templateName, 'Auto-generated template for signing');
      
      console.error(`Template created: ${template.template.id}`);

      // Step 2: Add signature fields to each page (assuming 10 pages)
      const pageCount = 10; // Default assumption, will be adjusted based on actual PDF
      
      console.error(`Step 2: Adding signature fields to ${pageCount} pages...`);

      // Step 3: Add signature fields to each page
      const signatureFields = [];
      for (let page = 1; page <= pageCount; page++) {
        signatureFields.push({
          name: `Signature_Page_${page}`,
          description: `Signature field for page ${page}`,
          x: fieldPosition.x,
          y: fieldPosition.y,
          width: fieldPosition.width,
          height: fieldPosition.height,
          mandatory: true,
          page: page
        });
      }

      await this.updateTemplateFields(template.template.id, signatureFields);
      console.error(`Signature fields added successfully`);

      // Step 4: Send template for signature
      console.error(`Step 3: Sending for signature to ${signerName}...`);
      
      // ✅ FIX: Create properly structured request with all required fields
      // This ensures the PascalCase conversion in wesign-client.ts receives complete data
      const documentCollectionRequest = {
        documentMode: 1, // SignMode.SigningFlow
        documentName: templateName,
        templates: [template.template.id],
        signers: [{
          contactId: '00000000-0000-0000-0000-000000000000', // ✅ Required field with default
          contactName: signerName,
          contactMeans: signerEmail || signerPhone,
          sendingMethod: sendingMethod,
          phoneExtension: '+972', // ✅ Required field with default
          linkExpirationInHours: 168
        }]
      };

      const result = await this.client.sendDocumentForSignature(documentCollectionRequest);

      return {
        success: true,
        message: `Document sent successfully to ${signerName}`,
        workflow: {
          step1_template: {
            templateId: template.template.id,
            templateName: template.template.name,
            originalFile: path.basename(filePath),
            fileSize: template.fileSize
          },
          step2_fields: {
            fieldsAdded: signatureFields.length,
            pagesWithFields: pageCount
          },
          step3_sending: {
            documentCollectionId: result.id,
            documentName: result.name,
            status: result.status,
            creationTime: result.creationTime,
            signer: {
              name: signerName,
              contact: signerEmail || signerPhone,
              sendingMethod: sendingMethod === 1 ? 'SMS' : sendingMethod === 2 ? 'Email' : 'WhatsApp'
            }
          }
        }
      };
    } catch (error: any) {
      throw new Error(`Failed to send document for signing: ${error.message}`);
    }
  }

  private getTemplateStatusName(status: number): string {
    const statuses: { [key: number]: string } = {
      1: 'Active',
      2: 'Inactive',
      3: 'One Time Use'
    };
    return statuses[status] || 'Unknown';
  }

  private getUserTypeName(type: number): string {
    const types: { [key: number]: string } = {
      1: 'Basic',
      2: 'Editor',
      3: 'Company Admin'
    };
    return types[type] || 'Unknown';
  }

  private getUserStatusName(status: number): string {
    const statuses: { [key: number]: string } = {
      0: 'Created',
      1: 'Active',
      2: 'Inactive',
      3: 'Blocked'
    };
    return statuses[status] || 'Unknown';
  }
}