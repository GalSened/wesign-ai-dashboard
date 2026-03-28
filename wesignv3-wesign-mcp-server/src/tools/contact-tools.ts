import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { WeSignClient } from '../wesign-client.js';
import {
  Contact,
  ContactGroup,
  CreateContactDTO,
  UpdateContactDTO,
  CreateContactGroupDTO,
  UpdateContactGroupDTO
} from '../types.js';

export class ContactTools {
  constructor(private client: WeSignClient) {}

  getTools(): Tool[] {
    return [
      {
        name: 'wesign_create_contact',
        description: 'Create a new contact in your WeSign address book',
        inputSchema: {
          type: 'object',
          properties: {
            firstName: {
              type: 'string',
              description: 'Contact first name'
            },
            lastName: {
              type: 'string',
              description: 'Contact last name'
            },
            email: {
              type: 'string',
              description: 'Contact email address (optional)'
            },
            phone: {
              type: 'string',
              description: 'Contact phone number (optional)'
            },
            company: {
              type: 'string',
              description: 'Company name (optional)'
            },
            notes: {
              type: 'string',
              description: 'Additional notes about the contact (optional)'
            },
            groupId: {
              type: 'string',
              description: 'Contact group ID to add this contact to (optional)'
            }
          },
          required: ['firstName', 'lastName']
        }
      },
      {
        name: 'wesign_create_contacts_bulk',
        description: 'Create multiple contacts at once from an array',
        inputSchema: {
          type: 'object',
          properties: {
            contacts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  email: { type: 'string' },
                  phone: { type: 'string' },
                  company: { type: 'string' },
                  notes: { type: 'string' },
                  groupId: { type: 'string' }
                },
                required: ['firstName', 'lastName']
              },
              description: 'Array of contacts to create'
            }
          },
          required: ['contacts']
        }
      },
      {
        name: 'wesign_list_contacts',
        description: 'List and search contacts with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query - searches in name, email, phone, company (optional)'
            },
            groupId: {
              type: 'string',
              description: 'Filter by contact group ID (optional)'
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip (default: 0)'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of contacts to return (default: 100)'
            }
          }
        }
      },
      {
        name: 'wesign_get_contact',
        description: 'Get detailed information about a specific contact',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: {
              type: 'string',
              description: 'ID of the contact to retrieve'
            }
          },
          required: ['contactId']
        }
      },
      {
        name: 'wesign_update_contact',
        description: 'Update an existing contact information',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: {
              type: 'string',
              description: 'ID of the contact to update'
            },
            firstName: {
              type: 'string',
              description: 'Updated first name'
            },
            lastName: {
              type: 'string',
              description: 'Updated last name'
            },
            email: {
              type: 'string',
              description: 'Updated email address (optional)'
            },
            phone: {
              type: 'string',
              description: 'Updated phone number (optional)'
            },
            company: {
              type: 'string',
              description: 'Updated company name (optional)'
            },
            notes: {
              type: 'string',
              description: 'Updated notes (optional)'
            },
            groupId: {
              type: 'string',
              description: 'Updated contact group ID (optional)'
            }
          },
          required: ['contactId', 'firstName', 'lastName']
        }
      },
      {
        name: 'wesign_delete_contact',
        description: 'Delete a contact from your address book',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: {
              type: 'string',
              description: 'ID of the contact to delete'
            }
          },
          required: ['contactId']
        }
      },
      {
        name: 'wesign_delete_contacts_batch',
        description: 'Delete multiple contacts at once',
        inputSchema: {
          type: 'object',
          properties: {
            contactIds: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Array of contact IDs to delete'
            }
          },
          required: ['contactIds']
        }
      },
      {
        name: 'wesign_list_contact_groups',
        description: 'List all contact groups',
        inputSchema: {
          type: 'object',
          properties: {
            offset: {
              type: 'number',
              description: 'Number of records to skip (default: 0)'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of groups to return (default: 100)'
            }
          }
        }
      },
      {
        name: 'wesign_get_contact_group',
        description: 'Get detailed information about a specific contact group',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: {
              type: 'string',
              description: 'ID of the contact group to retrieve'
            }
          },
          required: ['groupId']
        }
      },
      {
        name: 'wesign_create_contact_group',
        description: 'Create a new contact group',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the contact group'
            },
            description: {
              type: 'string',
              description: 'Description of the contact group (optional)'
            },
            contactIds: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Array of contact IDs to add to this group (optional)'
            }
          },
          required: ['name']
        }
      },
      {
        name: 'wesign_update_contact_group',
        description: 'Update an existing contact group',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: {
              type: 'string',
              description: 'ID of the contact group to update'
            },
            name: {
              type: 'string',
              description: 'Updated name for the contact group'
            },
            description: {
              type: 'string',
              description: 'Updated description (optional)'
            },
            contactIds: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Updated array of contact IDs in this group (optional)'
            }
          },
          required: ['groupId', 'name']
        }
      },
      {
        name: 'wesign_delete_contact_group',
        description: 'Delete a contact group (contacts remain, only the group is deleted)',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: {
              type: 'string',
              description: 'ID of the contact group to delete'
            }
          },
          required: ['groupId']
        }
      }
    ];
  }

  async executeContactTool(name: string, args: any): Promise<any> {
    if (!this.client.isAuthenticated()) {
      throw new Error('Not authenticated. Please login first using wesign_login.');
    }

    switch (name) {
      case 'wesign_create_contact':
        return await this.createContact(args);

      case 'wesign_create_contacts_bulk':
        return await this.createContactsBulk(args.contacts);

      case 'wesign_list_contacts':
        return await this.listContacts(args);

      case 'wesign_get_contact':
        return await this.getContact(args.contactId);

      case 'wesign_update_contact':
        return await this.updateContact(args);

      case 'wesign_delete_contact':
        return await this.deleteContact(args.contactId);

      case 'wesign_delete_contacts_batch':
        return await this.deleteContactsBatch(args.contactIds);

      case 'wesign_list_contact_groups':
        return await this.listContactGroups(args);

      case 'wesign_get_contact_group':
        return await this.getContactGroup(args.groupId);

      case 'wesign_create_contact_group':
        return await this.createContactGroup(args);

      case 'wesign_update_contact_group':
        return await this.updateContactGroup(args);

      case 'wesign_delete_contact_group':
        return await this.deleteContactGroup(args.groupId);

      default:
        throw new Error(`Unknown contact tool: ${name}`);
    }
  }

  private async createContact(dto: CreateContactDTO): Promise<any> {
    try {
      const contact = await this.client.createContact(dto);
      return {
        success: true,
        message: `Contact "${dto.firstName} ${dto.lastName}" created successfully`,
        contact: contact
      };
    } catch (error: any) {
      throw new Error(`Failed to create contact: ${error.message}`);
    }
  }

  private async createContactsBulk(contacts: CreateContactDTO[]): Promise<any> {
    try {
      const results = await this.client.createContactsBulk(contacts);
      return {
        success: true,
        message: `Created ${contacts.length} contact(s)`,
        totalCreated: contacts.length,
        contacts: results
      };
    } catch (error: any) {
      throw new Error(`Failed to create contacts in bulk: ${error.message}`);
    }
  }

  private async listContacts(args: any): Promise<any> {
    try {
      const { query, groupId, offset = 0, limit = 100 } = args;
      const contacts = await this.client.listContacts(query, groupId, offset, limit);

      return {
        success: true,
        message: `Found ${contacts.length} contact(s)`,
        count: contacts.length,
        filters: {
          query: query || 'none',
          groupId: groupId || 'none',
          offset,
          limit
        },
        contacts: contacts
      };
    } catch (error: any) {
      throw new Error(`Failed to list contacts: ${error.message}`);
    }
  }

  private async getContact(contactId: string): Promise<any> {
    try {
      const contact = await this.client.getContact(contactId);
      return {
        success: true,
        message: `Retrieved contact: ${contact.firstName} ${contact.lastName}`,
        contact: contact
      };
    } catch (error: any) {
      throw new Error(`Failed to get contact: ${error.message}`);
    }
  }

  private async updateContact(args: any): Promise<any> {
    try {
      const { contactId, ...updates } = args;
      const contact = await this.client.updateContact(contactId, updates);
      return {
        success: true,
        message: `Contact updated successfully`,
        contact: contact
      };
    } catch (error: any) {
      throw new Error(`Failed to update contact: ${error.message}`);
    }
  }

  private async deleteContact(contactId: string): Promise<any> {
    try {
      await this.client.deleteContact(contactId);
      return {
        success: true,
        message: `Contact deleted successfully`,
        contactId: contactId
      };
    } catch (error: any) {
      throw new Error(`Failed to delete contact: ${error.message}`);
    }
  }

  private async deleteContactsBatch(contactIds: string[]): Promise<any> {
    try {
      await this.client.deleteContactsBatch(contactIds);
      return {
        success: true,
        message: `Deleted ${contactIds.length} contact(s)`,
        deletedCount: contactIds.length,
        contactIds: contactIds
      };
    } catch (error: any) {
      throw new Error(`Failed to delete contacts: ${error.message}`);
    }
  }

  private async listContactGroups(args: any): Promise<any> {
    try {
      const { offset = 0, limit = 100 } = args;
      const groups = await this.client.listContactGroups(offset, limit);

      return {
        success: true,
        message: `Found ${groups.length} contact group(s)`,
        count: groups.length,
        groups: groups
      };
    } catch (error: any) {
      throw new Error(`Failed to list contact groups: ${error.message}`);
    }
  }

  private async getContactGroup(groupId: string): Promise<any> {
    try {
      const group = await this.client.getContactGroup(groupId);
      return {
        success: true,
        message: `Retrieved contact group: ${group.name}`,
        group: group
      };
    } catch (error: any) {
      throw new Error(`Failed to get contact group: ${error.message}`);
    }
  }

  private async createContactGroup(dto: CreateContactGroupDTO): Promise<any> {
    try {
      const group = await this.client.createContactGroup(dto);
      return {
        success: true,
        message: `Contact group "${dto.name}" created successfully`,
        group: group
      };
    } catch (error: any) {
      throw new Error(`Failed to create contact group: ${error.message}`);
    }
  }

  private async updateContactGroup(args: any): Promise<any> {
    try {
      const { groupId, ...updates } = args;
      const group = await this.client.updateContactGroup(groupId, updates);
      return {
        success: true,
        message: `Contact group updated successfully`,
        group: group
      };
    } catch (error: any) {
      throw new Error(`Failed to update contact group: ${error.message}`);
    }
  }

  private async deleteContactGroup(groupId: string): Promise<any> {
    try {
      await this.client.deleteContactGroup(groupId);
      return {
        success: true,
        message: `Contact group deleted successfully (contacts remain in address book)`,
        groupId: groupId
      };
    } catch (error: any) {
      throw new Error(`Failed to delete contact group: ${error.message}`);
    }
  }
}
