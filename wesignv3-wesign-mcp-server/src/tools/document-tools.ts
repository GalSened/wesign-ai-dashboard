import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { WeSignClient } from '../wesign-client.js';
import fs from 'fs-extra';
import * as path from 'path';
import mime from 'mime-types';

export class DocumentTools {
  constructor(private client: WeSignClient) {}

  getTools(): Tool[] {
    return [
      {
        name: 'wesign_upload_document',
        description: 'Upload a document to WeSign for signing workflow. Supports PDF, Word, Excel, and image formats.',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Path to the document file to upload'
            },
            name: {
              type: 'string',
              description: 'Optional custom name for the document. If not provided, uses the filename'
            }
          },
          required: ['filePath']
        }
      },
      {
        name: 'wesign_create_document_collection',
        description: 'Create a new document collection with one or more documents',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the document collection'
            },
            filePaths: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of file paths to include in the collection'
            }
          },
          required: ['name', 'filePaths']
        }
      },
      {
        name: 'wesign_get_document_info',
        description: 'Get detailed information about a document or document collection',
        inputSchema: {
          type: 'object',
          properties: {
            documentCollectionId: {
              type: 'string',
              description: 'ID of the document collection'
            }
          },
          required: ['documentCollectionId']
        }
      },
      {
        name: 'wesign_list_documents',
        description: 'List user\'s documents with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            offset: {
              type: 'number',
              description: 'Number of records to skip (default: 0)',
              default: 0
            },
            limit: {
              type: 'number',
              description: 'Maximum number of records to return (default: 50)',
              default: 50
            }
          }
        }
      },
      {
        name: 'wesign_download_document',
        description: 'Download a signed or unsigned document',
        inputSchema: {
          type: 'object',
          properties: {
            documentCollectionId: {
              type: 'string',
              description: 'ID of the document collection'
            },
            documentId: {
              type: 'string',
              description: 'ID of the specific document to download'
            },
            savePath: {
              type: 'string',
              description: 'Optional path to save the downloaded file. If not provided, returns base64 content'
            }
          },
          required: ['documentCollectionId', 'documentId']
        }
      },
      {
        name: 'wesign_search_documents',
        description: 'Search documents by status, date, signer name/email, or keywords in document name',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query - searches in document names, signer names, and emails'
            },
            status: {
              type: 'number',
              description: 'Filter by document status: 0=Draft, 1=Pending, 2=Completed, 3=Cancelled'
            },
            fromDate: {
              type: 'string',
              description: 'Filter documents created after this date (ISO 8601 format: YYYY-MM-DD)'
            },
            toDate: {
              type: 'string',
              description: 'Filter documents created before this date (ISO 8601 format: YYYY-MM-DD)'
            },
            signerEmail: {
              type: 'string',
              description: 'Filter by signer email address'
            },
            signerName: {
              type: 'string',
              description: 'Filter by signer name (partial match)'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 100)',
              default: 100
            }
          }
        }
      },
      {
        name: 'wesign_merge_documents',
        description: 'Combine multiple existing documents into a single document collection',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the merged document collection'
            },
            documentCollectionIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of document collection IDs to merge'
            }
          },
          required: ['name', 'documentCollectionIds']
        }
      },
      {
        name: 'wesign_delete_document',
        description: 'Delete a document collection permanently',
        inputSchema: {
          type: 'object',
          properties: {
            documentCollectionId: { type: 'string', description: 'ID of the document collection to delete' }
          },
          required: ['documentCollectionId']
        }
      },
      {
        name: 'wesign_delete_documents_batch',
        description: 'Delete multiple document collections at once',
        inputSchema: {
          type: 'object',
          properties: {
            documentCollectionIds: { type: 'array', items: { type: 'string' }, description: 'Array of document collection IDs to delete' }
          },
          required: ['documentCollectionIds']
        }
      },
      {
        name: 'wesign_get_page_count',
        description: 'Get the number of pages in a template or document',
        inputSchema: {
          type: 'object',
          properties: {
            templateId: { type: 'string', description: 'Template ID (for template page count)' },
            documentCollectionId: { type: 'string', description: 'Document collection ID (for document page count)' },
            documentId: { type: 'string', description: 'Document ID within the collection' }
          }
        }
      },
      {
        name: 'wesign_get_signing_links',
        description: 'Get all signing links for signers in a document collection',
        inputSchema: {
          type: 'object',
          properties: {
            documentCollectionId: { type: 'string', description: 'ID of the document collection' }
          },
          required: ['documentCollectionId']
        }
      },
      {
        name: 'wesign_export_pdf_fields',
        description: 'Export all signature/form field definitions from a signed document',
        inputSchema: {
          type: 'object',
          properties: {
            documentCollectionId: { type: 'string', description: 'ID of the document collection' }
          },
          required: ['documentCollectionId']
        }
      },
      {
        name: 'wesign_get_usage_report',
        description: 'Get document usage statistics and analytics report with optional date and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            fromDate: { type: 'string', description: 'Start date (ISO 8601, e.g., 2026-01-01)' },
            toDate: { type: 'string', description: 'End date (ISO 8601)' },
            statuses: { type: 'array', items: { type: 'number' }, description: 'Filter by status codes: 0=Draft, 1=Pending, 2=Completed, 3=Declined, 4=Canceled' }
          }
        }
      }
    ];
  }

  async executeDocumentTool(name: string, args: any): Promise<any> {
    if (!this.client.isAuthenticated()) {
      throw new Error('Not authenticated. Please login first using wesign_login.');
    }

    switch (name) {
      case 'wesign_upload_document':
        return await this.uploadDocument(args.filePath, args.name);

      case 'wesign_create_document_collection':
        return await this.createDocumentCollection(args.name, args.filePaths);

      case 'wesign_get_document_info':
        return await this.getDocumentInfo(args.documentCollectionId);

      case 'wesign_list_documents':
        return await this.listDocuments(args.offset || 0, args.limit || 50);

      case 'wesign_download_document':
        return await this.downloadDocument(args.documentCollectionId, args.documentId, args.savePath);

      case 'wesign_search_documents':
        return await this.searchDocuments(args);

      case 'wesign_merge_documents':
        return await this.mergeDocuments(args.name, args.documentCollectionIds);

      case 'wesign_delete_document':
        await this.client.deleteDocumentCollection(args.documentCollectionId);
        return { success: true, message: 'Document deleted successfully' };

      case 'wesign_delete_documents_batch':
        await this.client.deleteDocumentsBatch(args.documentCollectionIds);
        return { success: true, message: `${args.documentCollectionIds.length} documents deleted`, deletedCount: args.documentCollectionIds.length };

      case 'wesign_get_page_count':
        if (args.templateId) {
          const count = await this.client.getTemplatePageCount(args.templateId);
          return { pageCount: count, source: 'template', id: args.templateId };
        } else if (args.documentCollectionId && args.documentId) {
          const count = await this.client.getDocumentPageCount(args.documentCollectionId, args.documentId);
          return { pageCount: count, source: 'document', id: args.documentCollectionId };
        }
        throw new Error('Provide either templateId or (documentCollectionId + documentId)');

      case 'wesign_get_signing_links':
        const links = await this.client.getSigningLinks(args.documentCollectionId);
        return { success: true, links, count: Array.isArray(links) ? links.length : 0 };

      case 'wesign_export_pdf_fields':
        const fields = await this.client.exportPdfFields(args.documentCollectionId);
        return { success: true, fields };

      case 'wesign_get_usage_report':
        const report = await this.client.getUsageReport(args.fromDate, args.toDate, args.statuses);
        return { success: true, report };

      default:
        throw new Error(`Unknown document tool: ${name}`);
    }
  }

  private async uploadDocument(filePath: string, customName?: string): Promise<any> {
    try {
      // Check if file exists
      if (!await fs.pathExists(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Read file and convert to base64
      const fileBuffer = await fs.readFile(filePath);
      const base64Content = fileBuffer.toString('base64');

      // Get file info
      const fileName = customName || path.basename(filePath);
      const mimeType = mime.lookup(filePath) || 'application/octet-stream';

      // Create base64 data URL
      const base64File = `data:${mimeType};base64,${base64Content}`;

      // Create document collection with single document
      const result = await this.client.createDocumentCollection(fileName, [base64File]);

      return {
        success: true,
        documentCollection: result,
        message: `Document "${fileName}" uploaded successfully`,
        documentCollectionId: result.id,
        fileName: fileName,
        fileSize: fileBuffer.length,
        mimeType: mimeType
      };
    } catch (error: any) {
      throw new Error(`Failed to upload document: ${error.message}`);
    }
  }

  private async createDocumentCollection(name: string, filePaths: string[]): Promise<any> {
    try {
      const base64Files: string[] = [];
      const fileInfos: Array<{ name: string; size: number; type: string }> = [];

      for (const filePath of filePaths) {
        if (!await fs.pathExists(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }

        const fileBuffer = await fs.readFile(filePath);
        const base64Content = fileBuffer.toString('base64');
        const fileName = path.basename(filePath);
        const mimeType = mime.lookup(filePath) || 'application/octet-stream';

        const base64File = `data:${mimeType};base64,${base64Content}`;
        base64Files.push(base64File);

        fileInfos.push({
          name: fileName,
          size: fileBuffer.length,
          type: mimeType
        });
      }

      const result = await this.client.createDocumentCollection(name, base64Files);

      return {
        success: true,
        documentCollection: result,
        message: `Document collection "${name}" created with ${filePaths.length} documents`,
        documentCollectionId: result.id,
        files: fileInfos
      };
    } catch (error: any) {
      throw new Error(`Failed to create document collection: ${error.message}`);
    }
  }

  private async getDocumentInfo(documentCollectionId: string): Promise<any> {
    try {
      const documentCollection = await this.client.getDocumentCollection(documentCollectionId);

      return {
        success: true,
        documentCollection: {
          id: documentCollection.id,
          name: documentCollection.name,
          status: documentCollection.status,
          creationTime: documentCollection.creationTime,
          documentsCount: documentCollection.documents?.length || 0,
          documents: documentCollection.documents?.map(doc => ({
            id: doc.id,
            name: doc.name,
            pagesCount: doc.pagesCount,
            status: doc.status
          })),
          signersCount: documentCollection.signers?.length || 0,
          signers: documentCollection.signers?.map(signer => ({
            id: signer.id,
            name: `${signer.firstName} ${signer.lastName}`,
            email: signer.email,
            phone: signer.phone,
            status: signer.status,
            signingOrder: signer.signingOrder
          }))
        }
      };
    } catch (error: any) {
      throw new Error(`Failed to get document info: ${error.message}`);
    }
  }

  private async listDocuments(offset: number, limit: number): Promise<any> {
    try {
      const documentCollections = await this.client.getDocumentCollections(offset, limit);

      return {
        success: true,
        documents: documentCollections.map(collection => ({
          id: collection.id,
          name: collection.name,
          status: collection.status,
          creationTime: collection.creationTime,
          documentsCount: collection.documents?.length || 0,
          signersCount: collection.signers?.length || 0,
          completedSigners: collection.signers?.filter(s => s.status === 2).length || 0
        })),
        pagination: {
          offset,
          limit,
          count: documentCollections.length
        }
      };
    } catch (error: any) {
      throw new Error(`Failed to list documents: ${error.message}`);
    }
  }

  private async downloadDocument(documentCollectionId: string, documentId: string, savePath?: string): Promise<any> {
    try {
      const downloadResult = await this.client.downloadDocument(documentCollectionId, documentId);

      if (savePath) {
        // Save to file
        const base64Data = downloadResult.base64File.split(',')[1] || downloadResult.base64File;
        const fileBuffer = Buffer.from(base64Data, 'base64');

        await fs.ensureDir(path.dirname(savePath));
        await fs.writeFile(savePath, fileBuffer);

        return {
          success: true,
          message: `Document downloaded and saved to ${savePath}`,
          filePath: savePath,
          fileName: downloadResult.fileName,
          fileSize: fileBuffer.length
        };
      } else {
        // Return base64 content
        return {
          success: true,
          message: 'Document downloaded successfully',
          fileName: downloadResult.fileName,
          base64File: downloadResult.base64File,
          contentLength: downloadResult.base64File.length
        };
      }
    } catch (error: any) {
      throw new Error(`Failed to download document: ${error.message}`);
    }
  }

  private async searchDocuments(args: any): Promise<any> {
    try {
      const { query, status, fromDate, toDate, signerEmail, signerName, limit = 100 } = args;

      // Fetch all document collections (up to limit)
      const allDocs = await this.client.getDocumentCollections(0, limit);

      // Apply filters
      let filtered = allDocs;

      // Filter by status
      if (status !== undefined) {
        filtered = filtered.filter(doc => doc.status === status);
      }

      // Filter by date range
      if (fromDate) {
        const from = new Date(fromDate);
        filtered = filtered.filter(doc => new Date(doc.creationTime) >= from);
      }
      if (toDate) {
        const to = new Date(toDate);
        filtered = filtered.filter(doc => new Date(doc.creationTime) <= to);
      }

      // Filter by signer email
      if (signerEmail) {
        filtered = filtered.filter(doc =>
          doc.signers?.some(s => s.email?.toLowerCase().includes(signerEmail.toLowerCase()))
        );
      }

      // Filter by signer name
      if (signerName) {
        const nameLower = signerName.toLowerCase();
        filtered = filtered.filter(doc =>
          doc.signers?.some(s =>
            `${s.firstName} ${s.lastName}`.toLowerCase().includes(nameLower)
          )
        );
      }

      // Filter by query (search in document name, signer names, emails)
      if (query) {
        const queryLower = query.toLowerCase();
        filtered = filtered.filter(doc => {
          // Search in document name
          if (doc.name?.toLowerCase().includes(queryLower)) return true;

          // Search in signer names and emails
          if (doc.signers?.some(s =>
            s.email?.toLowerCase().includes(queryLower) ||
            `${s.firstName} ${s.lastName}`.toLowerCase().includes(queryLower)
          )) return true;

          return false;
        });
      }

      return {
        success: true,
        message: `Found ${filtered.length} document(s) matching criteria`,
        count: filtered.length,
        filters: {
          query: query || 'none',
          status: status !== undefined ? status : 'any',
          fromDate: fromDate || 'none',
          toDate: toDate || 'none',
          signerEmail: signerEmail || 'none',
          signerName: signerName || 'none'
        },
        documents: filtered.map(doc => ({
          id: doc.id,
          name: doc.name,
          status: doc.status,
          statusText: this.getStatusText(doc.status),
          creationTime: doc.creationTime,
          documentsCount: doc.documents?.length || 0,
          signersCount: doc.signers?.length || 0,
          completedSigners: doc.signers?.filter(s => s.status === 2).length || 0,
          signers: doc.signers?.map(s => ({
            name: `${s.firstName} ${s.lastName}`,
            email: s.email,
            phone: s.phone,
            status: s.status
          }))
        }))
      };
    } catch (error: any) {
      throw new Error(`Failed to search documents: ${error.message}`);
    }
  }

  private async mergeDocuments(name: string, documentCollectionIds: string[]): Promise<any> {
    try {
      if (documentCollectionIds.length < 2) {
        throw new Error('At least 2 document collections are required for merging');
      }

      const base64Files: string[] = [];
      const mergedInfo: any[] = [];

      // Download all documents from each collection
      for (const collectionId of documentCollectionIds) {
        const collection = await this.client.getDocumentCollection(collectionId);

        if (!collection.documents || collection.documents.length === 0) {
          throw new Error(`Document collection ${collectionId} has no documents`);
        }

        for (const doc of collection.documents) {
          const downloadResult = await this.client.downloadDocument(collectionId, doc.id);
          base64Files.push(downloadResult.base64File);

          mergedInfo.push({
            sourceCollection: collection.name,
            sourceCollectionId: collectionId,
            documentName: doc.name,
            documentId: doc.id,
            pagesCount: doc.pagesCount
          });
        }
      }

      // Create new collection with merged documents
      const mergedCollection = await this.client.createDocumentCollection(name, base64Files);

      return {
        success: true,
        message: `Merged ${documentCollectionIds.length} document collections into "${name}"`,
        mergedCollectionId: mergedCollection.id,
        mergedCollectionName: mergedCollection.name,
        totalDocuments: base64Files.length,
        sourceCollections: documentCollectionIds.length,
        documentsDetails: mergedInfo
      };
    } catch (error: any) {
      throw new Error(`Failed to merge documents: ${error.message}`);
    }
  }

  private getStatusText(status: number): string {
    switch (status) {
      case 0: return 'Draft';
      case 1: return 'Pending';
      case 2: return 'Completed';
      case 3: return 'Cancelled';
      default: return `Unknown (${status})`;
    }
  }
}