import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { WeSignClient } from '../wesign-client.js';

export class AuthTools {
  constructor(private client: WeSignClient) {}

  getTools(): Tool[] {
    return [
      {
        name: 'wesign_login',
        description: 'Authenticate with WeSign using email and password',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address for WeSign account',
              format: 'email'
            },
            password: {
              type: 'string',
              description: 'Password for WeSign account'
            },
            persistent: {
              type: 'boolean',
              description: 'Whether to use persistent session (default: false)',
              default: false
            }
          },
          required: ['email', 'password']
        }
      },
      {
        name: 'wesign_logout',
        description: 'Logout from WeSign and clear authentication tokens',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'wesign_refresh_token',
        description: 'Refresh the authentication token if expired',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  async executeAuthTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'wesign_login':
        return await this.login(args.email, args.password, args.persistent || false);

      case 'wesign_logout':
        return await this.logout();

      case 'wesign_refresh_token':
        return await this.refreshToken();

      default:
        throw new Error(`Unknown auth tool: ${name}`);
    }
  }

  private async login(email: string, password: string, persistent: boolean): Promise<any> {
    try {
      const result = await this.client.login(email, password, persistent);

      if (result.success) {
        // Get user information after successful login
        try {
          const user = await this.client.getCurrentUser();
          return {
            success: true,
            message: 'Login successful',
            user: {
              name: user.name,
              email: user.email,
              companyName: user.companyName,
              type: this.getUserTypeName(user.type),
              language: user.userConfiguration.language === 1 ? 'English' : 'Hebrew',
              remainingDocuments: user.program.remainingDocumentsForMonth
            },
            sessionType: persistent ? 'persistent' : 'session'
          };
        } catch (userError) {
          // Login succeeded but couldn't get user info
          return {
            success: true,
            message: 'Login successful, but could not retrieve user details',
            sessionType: persistent ? 'persistent' : 'session',
            warning: 'User details unavailable'
          };
        }
      } else {
        throw new Error(result.message || 'Login failed');
      }
    } catch (error: any) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  private async logout(): Promise<any> {
    try {
      await this.client.logout();
      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error: any) {
      // Even if logout API call fails, we clear local tokens
      return {
        success: true,
        message: 'Logout completed (tokens cleared locally)',
        warning: `Server logout failed: ${error.message}`
      };
    }
  }

  private async refreshToken(): Promise<any> {
    try {
      if (!this.client.isAuthenticated()) {
        throw new Error('Not authenticated. Please login first.');
      }

      const tokens = this.client.getTokens();
      if (!tokens?.refreshToken) {
        throw new Error('No refresh token available. Please login again.');
      }

      await this.client.refreshToken();

      return {
        success: true,
        message: 'Token refreshed successfully'
      };
    } catch (error: any) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  private getUserTypeName(type: number): string {
    const types: { [key: number]: string } = {
      1: 'Basic',
      2: 'Editor',
      3: 'Company Admin'
    };
    return types[type] || 'Unknown';
  }
}