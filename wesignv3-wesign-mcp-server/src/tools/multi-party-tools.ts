import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { WeSignClient } from '../wesign-client.js';
import type { DocumentCollectionCreateRequest, DocumentSigner, SimpleDocument, SendingMethod } from '../types.js';
import { SignMode, FieldType } from '../types.js';
import fs from 'fs-extra';
import * as path from 'path';
import mime from 'mime-types';

export class MultiPartyTools {
  constructor(private client: WeSignClient) {}

  getTools(): Tool[] {
    return [
      {
        name: 'wesign_send_for_signature',
        description: 'Send document to multiple signers for signature workflow',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Path to the document file to send'
            },
            documentName: {
              type: 'string',
              description: 'Name for the document collection'
            },
            signers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  contactName: {
                    type: 'string',
                    description: 'Full name of the signer'
                  },
                  contactMeans: {
                    type: 'string',
                    description: 'Email address or phone number for the signer'
                  },
                  sendingMethod: {
                    type: 'number',
                    description: 'Sending method: 1=Email, 2=SMS, 3=WhatsApp',
                    enum: [1, 2, 3]
                  },
                  linkExpirationInHours: {
                    type: 'number',
                    description: 'Hours until signing link expires (optional, default: 168)',
                    default: 168
                  },
                  senderNote: {
                    type: 'string',
                    description: 'Optional personal note to this signer'
                  }
                },
                required: ['contactName', 'contactMeans', 'sendingMethod']
              },
              description: 'Array of signers who will receive the document'
            },
            senderNote: {
              type: 'string',
              description: 'Optional general note from sender to all signers'
            },
            redirectUrl: {
              type: 'string',
              description: 'Optional URL to redirect signers after signing'
            }
          },
          required: ['filePath', 'documentName', 'signers']
        }
      },
      {
        name: 'wesign_send_simple_document',
        description: 'Send a document using a template to a single signer (simplified workflow)',
        inputSchema: {
          type: 'object',
          properties: {
            templateId: {
              type: 'string',
              description: 'ID of the template to use'
            },
            documentName: {
              type: 'string',
              description: 'Name for the new document'
            },
            signerName: {
              type: 'string',
              description: 'Full name of the signer'
            },
            signerMeans: {
              type: 'string',
              description: 'Email address or phone number of the signer'
            },
            redirectUrl: {
              type: 'string',
              description: 'Optional URL to redirect signer after signing'
            }
          },
          required: ['templateId', 'documentName', 'signerName', 'signerMeans']
        }
      },
      {
        name: 'wesign_resend_to_signer',
        description: 'Resend document notification to a specific signer',
        inputSchema: {
          type: 'object',
          properties: {
            documentCollectionId: {
              type: 'string',
              description: 'ID of the document collection'
            },
            signerId: {
              type: 'string',
              description: 'ID of the signer to resend to'
            },
            sendingMethod: {
              type: 'number',
              description: 'Sending method: 1=Email, 2=SMS, 3=WhatsApp',
              enum: [1, 2, 3]
            }
          },
          required: ['documentCollectionId', 'signerId', 'sendingMethod']
        }
      },
      {
        name: 'wesign_replace_signer',
        description: 'Replace a signer in an existing document collection',
        inputSchema: {
          type: 'object',
          properties: {
            documentCollectionId: {
              type: 'string',
              description: 'ID of the document collection'
            },
            signerId: {
              type: 'string',
              description: 'ID of the signer to replace'
            },
            newSigner: {
              type: 'object',
              properties: {
                contactName: {
                  type: 'string',
                  description: 'Full name of the new signer'
                },
                contactMeans: {
                  type: 'string',
                  description: 'Email address or phone number for the new signer'
                },
                sendingMethod: {
                  type: 'number',
                  description: 'Sending method: 1=Email, 2=SMS, 3=WhatsApp',
                  enum: [1, 2, 3]
                }
              },
              required: ['contactName', 'contactMeans', 'sendingMethod']
            }
          },
          required: ['documentCollectionId', 'signerId', 'newSigner']
        }
      },
      {
        name: 'wesign_cancel_document',
        description: 'Cancel a document collection and stop the signing process',
        inputSchema: {
          type: 'object',
          properties: {
            documentCollectionId: {
              type: 'string',
              description: 'ID of the document collection to cancel'
            }
          },
          required: ['documentCollectionId']
        }
      },
      {
        name: 'wesign_reactivate_document',
        description: 'Reactivate a cancelled or expired document collection',
        inputSchema: {
          type: 'object',
          properties: {
            documentCollectionId: {
              type: 'string',
              description: 'ID of the document collection to reactivate'
            }
          },
          required: ['documentCollectionId']
        }
      },
      {
        name: 'wesign_share_document',
        description: 'Share a document with additional people via email (view-only access)',
        inputSchema: {
          type: 'object',
          properties: {
            documentCollectionId: {
              type: 'string',
              description: 'ID of the document collection to share'
            },
            emails: {
              type: 'array',
              items: { type: 'string', format: 'email' },
              description: 'Array of email addresses to share with'
            },
            message: {
              type: 'string',
              description: 'Optional message to include in the share email'
            }
          },
          required: ['documentCollectionId', 'emails']
        }
      },
      {
        name: 'wesign_get_signer_link',
        description: 'Get a live signing link for a specific signer',
        inputSchema: {
          type: 'object',
          properties: {
            documentCollectionId: {
              type: 'string',
              description: 'ID of the document collection'
            },
            signerId: {
              type: 'string',
              description: 'ID of the signer to get the link for'
            }
          },
          required: ['documentCollectionId', 'signerId']
        }
      },
      {
        name: 'wesign_bulk_send',
        description: 'Send a template-based document to multiple signers from an Excel file (distribution mechanism). Use for mass sending.',
        inputSchema: {
          type: 'object',
          properties: {
            templateId: { type: 'string', description: 'ID of the template to use for bulk sending' },
            filePath: { type: 'string', description: 'Path to the Excel file containing signer information (name, email, phone)' }
          },
          required: ['templateId', 'filePath']
        }
      }
    ];
  }

  async executeMultiPartyTool(name: string, args: any): Promise<any> {
    if (!this.client.isAuthenticated()) {
      throw new Error('Not authenticated. Please login first using wesign_login.');
    }

    switch (name) {
      case 'wesign_send_for_signature':
        return await this.sendForSignature(args.filePath, args.documentName, args.signers, args.senderNote, args.redirectUrl);

      case 'wesign_send_simple_document':
        return await this.sendSimpleDocument(args.templateId, args.documentName, args.signerName, args.signerMeans, args.redirectUrl);

      case 'wesign_resend_to_signer':
        return await this.resendToSigner(args.documentCollectionId, args.signerId, args.sendingMethod);

      case 'wesign_replace_signer':
        return await this.replaceSigner(args.documentCollectionId, args.signerId, args.newSigner);

      case 'wesign_cancel_document':
        return await this.cancelDocument(args.documentCollectionId);

      case 'wesign_reactivate_document':
        return await this.reactivateDocument(args.documentCollectionId);

      case 'wesign_share_document':
        return await this.shareDocument(args.documentCollectionId, args.emails, args.message);

      case 'wesign_get_signer_link':
        return await this.getSignerLink(args.documentCollectionId, args.signerId);

      case 'wesign_bulk_send':
        return await this.bulkSend(args.templateId, args.filePath);

      default:
        throw new Error(`Unknown multi-party tool: ${name}`);
    }
  }

  private async bulkSend(templateId: string, filePath: string): Promise<any> {
    try {
      if (!await fs.pathExists(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      const fileBuffer = await fs.readFile(filePath);
      const base64Content = fileBuffer.toString('base64');
      const result = await this.client.distributionMechanism(templateId, base64Content);
      return { success: true, message: `Bulk send initiated`, distributionId: result?.id, data: result };
    } catch (error: any) {
      throw new Error(`Failed to bulk send: ${error.message}`);
    }
  }

  private async sendForSignature(filePath: string, documentName: string, signers: any[], senderNote?: string, redirectUrl?: string): Promise<any> {
    try {
      // Check if file exists
      if (!await fs.pathExists(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Read file and convert to base64
      const fileBuffer = await fs.readFile(filePath);
      const base64Content = fileBuffer.toString('base64');
      const mimeType = mime.lookup(filePath) || 'application/octet-stream';
      const base64File = `data:${mimeType};base64,${base64Content}`;

      // STEP 1: Create template first (CORRECT WeSign workflow)
      console.log(`Creating template: ${documentName}`);
      const template = await this.client.createTemplate(documentName, base64File, `Template for multi-party signing: ${documentName}`);
      console.log(`Template created with ID: ${template.id}`);

      // Build signers array
      // NOTE: signerFields in SignerDTO is for filling field VALUES (templateId, fieldName, fieldValue),
      // NOT for positioning fields. Field positioning must be done via PDF form fields or template editor.
      const documentSigners: DocumentSigner[] = signers.map((signer) => ({
        contactName: signer.contactName,
        contactMeans: signer.contactMeans,
        sendingMethod: signer.sendingMethod as SendingMethod,
        linkExpirationInHours: signer.linkExpirationInHours || 168,
        senderNote: signer.senderNote
      }));

      // STEP 2: Create document collection request using template GUID
      const request: DocumentCollectionCreateRequest = {
        documentMode: SignMode.SigningFlow,
        documentName: documentName,
        templates: [template.id], // ✅ CORRECT: Use template GUID instead of base64
        signers: documentSigners,
        senderNote: senderNote,
        redirectUrl: redirectUrl
      };

      // Send template for signature
      console.log(`Sending template ${template.id} for signature to ${signers.length} recipients`);
      const result = await this.client.sendDocumentForSignature(request);

      return {
        success: true,
        message: `Document "${documentName}" sent to ${signers.length} signers successfully`,
        documentCollectionId: result.id,
        documentName: result.name,
        status: result.status,
        creationTime: result.creationTime,
        templateId: template.id, // Include template ID for reference
        templateName: template.name,
        signersCount: signers.length,
        signers: result.signers?.map(signer => ({
          id: signer.id,
          name: `${signer.firstName} ${signer.lastName}`,
          email: signer.email,
          phone: signer.phone,
          status: signer.status,
          statusName: this.getSignerStatusName(signer.status),
          signingOrder: signer.signingOrder
        })),
        originalFileName: path.basename(filePath),
        fileSize: fileBuffer.length,
        mimeType: mimeType,
        workflow: 'template-based multi-party signing'
      };
    } catch (error: any) {
      throw new Error(`Failed to send document for signature: ${error.message}`);
    }
  }

  private async sendSimpleDocument(templateId: string, documentName: string, signerName: string, signerMeans: string, redirectUrl?: string): Promise<any> {
    try {
      const request: SimpleDocument = {
        templateId: templateId,
        documentName: documentName,
        signerName: signerName,
        signerMeans: signerMeans,
        redirectUrl: redirectUrl
      };

      const result = await this.client.sendSimpleDocument(request);

      return {
        success: true,
        message: `Simple document "${documentName}" sent to ${signerName} successfully`,
        documentCollectionId: result.id,
        documentName: result.name,
        status: result.status,
        creationTime: result.creationTime,
        signer: {
          name: signerName,
          contact: signerMeans
        },
        templateUsed: templateId
      };
    } catch (error: any) {
      throw new Error(`Failed to send simple document: ${error.message}`);
    }
  }

  private async resendToSigner(documentCollectionId: string, signerId: string, sendingMethod: SendingMethod): Promise<any> {
    try {
      const result = await this.client.resendDocumentToSigner(documentCollectionId, signerId, sendingMethod);

      return {
        success: result.success,
        message: `Document resent to signer successfully via ${this.getSendingMethodName(sendingMethod)}`,
        sendingMethod: this.getSendingMethodName(sendingMethod),
        documentCollectionId: documentCollectionId,
        signerId: signerId
      };
    } catch (error: any) {
      throw new Error(`Failed to resend to signer: ${error.message}`);
    }
  }

  private async replaceSigner(documentCollectionId: string, signerId: string, newSigner: any): Promise<any> {
    try {
      const signerData: DocumentSigner = {
        contactName: newSigner.contactName,
        contactMeans: newSigner.contactMeans,
        sendingMethod: newSigner.sendingMethod as SendingMethod
      };

      const result = await this.client.replaceSigner(documentCollectionId, signerId, signerData);

      return {
        success: result.success,
        message: `Signer replaced successfully`,
        documentCollectionId: documentCollectionId,
        oldSignerId: signerId,
        newSigner: {
          name: newSigner.contactName,
          contact: newSigner.contactMeans,
          sendingMethod: this.getSendingMethodName(newSigner.sendingMethod)
        }
      };
    } catch (error: any) {
      throw new Error(`Failed to replace signer: ${error.message}`);
    }
  }

  private async cancelDocument(documentCollectionId: string): Promise<any> {
    try {
      const result = await this.client.cancelDocumentCollection(documentCollectionId);

      return {
        success: result.success,
        message: 'Document collection cancelled successfully',
        documentCollectionId: documentCollectionId
      };
    } catch (error: any) {
      throw new Error(`Failed to cancel document: ${error.message}`);
    }
  }

  private async reactivateDocument(documentCollectionId: string): Promise<any> {
    try {
      const result = await this.client.reactivateDocumentCollection(documentCollectionId);

      return {
        success: result.success,
        message: 'Document collection reactivated successfully',
        documentCollectionId: documentCollectionId
      };
    } catch (error: any) {
      throw new Error(`Failed to reactivate document: ${error.message}`);
    }
  }

  private async shareDocument(documentCollectionId: string, emails: string[], message?: string): Promise<any> {
    try {
      const result = await this.client.shareDocument(documentCollectionId, emails, message);

      return {
        success: result.success,
        message: `Document shared with ${emails.length} recipients successfully`,
        documentCollectionId: documentCollectionId,
        sharedWith: emails,
        recipientsCount: emails.length,
        shareMessage: message || 'No custom message'
      };
    } catch (error: any) {
      throw new Error(`Failed to share document: ${error.message}`);
    }
  }

  private async getSignerLink(documentCollectionId: string, signerId: string): Promise<any> {
    try {
      const result = await this.client.getSenderLiveLink(documentCollectionId, signerId);

      return {
        success: true,
        message: 'Signer link retrieved successfully',
        documentCollectionId: documentCollectionId,
        signerId: signerId,
        liveLink: result.liveLink
      };
    } catch (error: any) {
      throw new Error(`Failed to get signer link: ${error.message}`);
    }
  }

  private getSignerStatusName(status: number): string {
    const statuses: { [key: number]: string } = {
      0: 'Pending',
      1: 'In Progress',
      2: 'Completed',
      3: 'Declined'
    };
    return statuses[status] || 'Unknown';
  }

  private getSendingMethodName(method: number): string {
    const methods: { [key: number]: string } = {
      1: 'SMS',      // ✅ CORRECTED: SMS is 1
      2: 'Email',    // ✅ CORRECTED: Email is 2
      3: 'WhatsApp'  // Tablet/WhatsApp is 3
    };
    return methods[method] || 'Unknown';
  }
}