import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class WeSignResources {
  private knowledgeBase: string | null = null;

  async getKnowledgeBase(): Promise<string> {
    if (!this.knowledgeBase) {
      try {
        const knowledgeBasePath = join(__dirname, '..', 'WESIGN_KNOWLEDGE_BASE.md');
        this.knowledgeBase = await fs.readFile(knowledgeBasePath, 'utf-8');
      } catch (error) {
        console.error('Failed to load knowledge base:', error);
        this.knowledgeBase = 'Knowledge base not available';
      }
    }
    return this.knowledgeBase;
  }

  async getQuickStart(): Promise<string> {
    try {
      const quickStartPath = join(__dirname, '..', 'QUICK_START.md');
      return await fs.readFile(quickStartPath, 'utf-8');
    } catch (error) {
      console.error('Failed to load quick start:', error);
      return 'Quick start guide not available';
    }
  }

  async getExamples(): Promise<string> {
    try {
      const examplesPath = join(__dirname, '..', 'EXAMPLES.md');
      return await fs.readFile(examplesPath, 'utf-8');
    } catch (error) {
      console.error('Failed to load examples:', error);
      return 'Examples not available';
    }
  }

  async getImplementationStatus(): Promise<string> {
    try {
      const statusPath = join(__dirname, '..', 'IMPLEMENTATION_STATUS.md');
      return await fs.readFile(statusPath, 'utf-8');
    } catch (error) {
      console.error('Failed to load implementation status:', error);
      return 'Implementation status not available';
    }
  }

  getResourcesList() {
    return [
      {
        uri: 'wesign://knowledge-base',
        name: 'WeSign Complete Knowledge Base',
        description: 'Comprehensive documentation of WeSign platform architecture, APIs, workflows, and best practices',
        mimeType: 'text/markdown'
      },
      {
        uri: 'wesign://quick-start',
        name: 'WeSign MCP Server Quick Start',
        description: 'Step-by-step guide to get started with WeSign MCP Server in 5 minutes',
        mimeType: 'text/markdown'
      },
      {
        uri: 'wesign://examples',
        name: 'WeSign Usage Examples',
        description: 'Practical code examples for common WeSign operations and workflows',
        mimeType: 'text/markdown'
      },
      {
        uri: 'wesign://implementation-status',
        name: 'WeSign MCP Server Implementation Status',
        description: 'Complete technical details and implementation status of all MCP server features',
        mimeType: 'text/markdown'
      }
    ];
  }

  async getResourceContent(uri: string): Promise<string> {
    switch (uri) {
      case 'wesign://knowledge-base':
        return await this.getKnowledgeBase();
      case 'wesign://quick-start':
        return await this.getQuickStart();
      case 'wesign://examples':
        return await this.getExamples();
      case 'wesign://implementation-status':
        return await this.getImplementationStatus();
      default:
        throw new Error(`Unknown resource URI: ${uri}`);
    }
  }
}