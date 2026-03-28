import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { WeSignClient } from '../wesign-client.js';
import { parsePosition, getFieldSize, validateCoordinates } from '../utils/position-parser.js';

export class SmartFieldTools {
  constructor(private client: WeSignClient) {}

  getTools(): Tool[] {
    return [
      {
        name: 'wesign_add_field_smart',
        description: 'Add a signature/form field using natural language positioning. Examples: "bottom left", "top right corner", "center of page", "below the title", "above signature line". Supports all position descriptions in plain English.',
        inputSchema: {
          type: 'object',
          properties: {
            templateId: {
              type: 'string',
              description: 'ID of the template to add fields to'
            },
            fields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['signature', 'initials', 'date', 'text', 'checkbox'],
                    description: 'Type of field to add'
                  },
                  name: {
                    type: 'string',
                    description: 'Unique name for the field (e.g., "Signature_1")'
                  },
                  page: {
                    type: 'number',
                    description: 'Page number (1-based)'
                  },
                  position: {
                    type: 'string',
                    description: 'Natural language position description. Examples: "bottom center", "top right", "lower left corner", "middle of page", "below text", "above signature", "left side", "right edge"'
                  },
                  referenceText: {
                    type: 'string',
                    description: 'Optional: Text to position relative to (e.g., "Sign here:", "Date:")'
                  },
                  mandatory: {
                    type: 'boolean',
                    description: 'Whether field is required (default: true)',
                    default: true
                  },
                  width: {
                    type: 'number',
                    description: 'Optional: Custom field width in points (default: auto based on type)'
                  },
                  height: {
                    type: 'number',
                    description: 'Optional: Custom field height in points (default: auto based on type)'
                  }
                },
                required: ['type', 'name', 'page', 'position']
              },
              description: 'Array of fields to add with natural language positions'
            }
          },
          required: ['templateId', 'fields']
        }
      },
      {
        name: 'wesign_add_signature_preset',
        description: 'Add signature fields using common presets for quick setup',
        inputSchema: {
          type: 'object',
          properties: {
            templateId: {
              type: 'string',
              description: 'ID of the template'
            },
            preset: {
              type: 'string',
              enum: [
                'signature-bottom-all-pages',
                'signature-bottom-first-page',
                'signature-bottom-last-page',
                'initials-bottom-right-all-pages',
                'signature-and-date-bottom',
                'signature-initials-date-bottom'
              ],
              description: 'Preset configuration for common signature scenarios'
            },
            pageCount: {
              type: 'number',
              description: 'Total number of pages in document (for all-pages presets)'
            }
          },
          required: ['templateId', 'preset']
        }
      }
    ];
  }

  async executeSmartFieldTool(name: string, args: any): Promise<any> {
    if (!this.client.isAuthenticated()) {
      throw new Error('Not authenticated. Please login first using wesign_login.');
    }

    switch (name) {
      case 'wesign_add_field_smart':
        return await this.addFieldSmart(args);

      case 'wesign_add_signature_preset':
        return await this.addSignaturePreset(args);

      default:
        throw new Error(`Unknown smart field tool: ${name}`);
    }
  }

  private async resolveTemplateId(id: string): Promise<string> {
    // If already a GUID, return as-is
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return id;
    }
    // Resolve name → GUID by fetching template list (fuzzy match)
    try {
      const templates = await this.client.getTemplates(0, 100);
      // Clean up LLM-mangled names: remove "template_id_of_", underscores, etc.
      const cleanId = id
        .replace(/^template_id_of_/i, '')
        .replace(/_/g, ' ')
        .trim();

      for (const t of templates) {
        const name = (t as any).name || '';
        const guid = (t as any).templateId || (t as any).id;
        if (!guid) continue;

        // Exact match
        if (name === id || name === cleanId) {
          console.log(`Resolved template "${id}" → ${guid} (exact match: "${name}")`);
          return guid;
        }
        // Case-insensitive match
        if (name.toLowerCase() === cleanId.toLowerCase()) {
          console.log(`Resolved template "${id}" → ${guid} (case match: "${name}")`);
          return guid;
        }
        // Partial/fuzzy match (template name contains the search or vice versa)
        if (name.includes(cleanId) || cleanId.includes(name)) {
          console.log(`Resolved template "${id}" → ${guid} (fuzzy match: "${name}")`);
          return guid;
        }
      }
      console.error(`Template "${id}" (cleaned: "${cleanId}") not found in ${templates.length} templates`);
    } catch (e) {
      console.error(`Template resolution failed: ${e}`);
    }
    return id; // Return original if not resolved
  }

  private async addFieldSmart(args: any): Promise<any> {
    try {
      let { templateId, fields } = args;
      templateId = await this.resolveTemplateId(templateId);
      const processedFields: any[] = [];
      const warnings: string[] = [];

      // Process each field
      for (const field of fields) {
        // Get field dimensions
        const fieldSize = field.width && field.height
          ? { width: field.width, height: field.height }
          : getFieldSize(field.type);

        // Parse natural language position
        const positionResult = parsePosition(
          field.position,
          field.type,
          undefined, // Use default page size
          field.referenceText
        );

        // Validate coordinates
        const isValid = validateCoordinates(
          positionResult.x,
          positionResult.y,
          fieldSize
        );

        if (!isValid) {
          warnings.push(
            `Field "${field.name}" coordinates may be out of bounds. ` +
            `Position: ${field.position}, Coordinates: (${positionResult.x}, ${positionResult.y})`
          );
        }

        // Add explanation if confidence is not high
        if (positionResult.confidence !== 'high') {
          warnings.push(
            `Field "${field.name}": ${positionResult.explanation || `Confidence: ${positionResult.confidence}`}`
          );
        }

        processedFields.push({
          name: field.name,
          description: `${field.type} field - ${field.position}`,
          x: positionResult.x,
          y: positionResult.y,
          width: fieldSize.width,
          height: fieldSize.height,
          mandatory: field.mandatory ?? true,
          page: field.page,
          signingType: field.type === 'signature' || field.type === 'initials' ? 3 : undefined
        });
      }

      // Convert to PDFFields structure
      const pdfFields: import('../types.js').PDFFields = {
        signatureFields: processedFields
          .filter(f => fields.find((of: any) => of.name === f.name)?.type === 'signature' ||
                       fields.find((of: any) => of.name === f.name)?.type === 'initials')
          .map(f => ({
            name: f.name,
            description: f.description,
            x: f.x,
            y: f.y,
            width: f.width,
            height: f.height,
            mandatory: f.mandatory,
            page: f.page,
            image: '',
            signingType: f.signingType
          })),
        textFields: processedFields
          .filter(f => fields.find((of: any) => of.name === f.name)?.type === 'text' ||
                       fields.find((of: any) => of.name === f.name)?.type === 'date')
          .map(f => {
            const originalField = fields.find((of: any) => of.name === f.name);
            const fieldType = originalField?.type === 'date' ? 4 : 3; // 4 = Date, 3 = Text
            return {
              name: f.name,
              description: f.description,
              x: f.x,
              y: f.y,
              width: f.width,
              height: f.height,
              mandatory: f.mandatory,
              page: f.page,
              value: '',
              textFieldType: fieldType
            };
          }),
        checkBoxFields: processedFields
          .filter(f => fields.find((of: any) => of.name === f.name)?.type === 'checkbox')
          .map(f => ({
            name: f.name,
            description: f.description,
            x: f.x,
            y: f.y,
            width: f.width,
            height: f.height,
            mandatory: f.mandatory,
            page: f.page,
            isChecked: false
          }))
      };

      // Update template with fields
      await this.client.updateTemplateFields(templateId, pdfFields);

      return {
        success: true,
        message: `Added ${processedFields.length} field(s) using natural language positioning`,
        templateId: templateId,
        fieldsAdded: processedFields.length,
        fields: processedFields.map((f, idx) => ({
          index: idx + 1,
          name: f.name,
          type: fields[idx].type,
          page: f.page,
          position: fields[idx].position,
          coordinates: { x: f.x, y: f.y },
          size: { width: f.width, height: f.height },
          confidence: 'high'
        })),
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error: any) {
      throw new Error(`Failed to add fields: ${error.message}`);
    }
  }

  private async addSignaturePreset(args: any): Promise<any> {
    try {
      const { templateId, preset, pageCount = 1 } = args;
      const fields: any[] = [];

      switch (preset) {
        case 'signature-bottom-all-pages':
          for (let page = 1; page <= pageCount; page++) {
            fields.push({
              type: 'signature',
              name: `Signature_Page_${page}`,
              page: page,
              position: 'bottom center'
            });
          }
          break;

        case 'signature-bottom-first-page':
          fields.push({
            type: 'signature',
            name: 'Signature',
            page: 1,
            position: 'bottom center'
          });
          break;

        case 'signature-bottom-last-page':
          fields.push({
            type: 'signature',
            name: 'Signature',
            page: pageCount,
            position: 'bottom center'
          });
          break;

        case 'initials-bottom-right-all-pages':
          for (let page = 1; page <= pageCount; page++) {
            fields.push({
              type: 'initials',
              name: `Initials_Page_${page}`,
              page: page,
              position: 'bottom right'
            });
          }
          break;

        case 'signature-and-date-bottom':
          fields.push({
            type: 'signature',
            name: 'Signature',
            page: 1,
            position: 'bottom left'
          });
          fields.push({
            type: 'date',
            name: 'Date',
            page: 1,
            position: 'bottom right'
          });
          break;

        case 'signature-initials-date-bottom':
          fields.push({
            type: 'signature',
            name: 'Signature',
            page: 1,
            position: 'bottom left'
          });
          fields.push({
            type: 'initials',
            name: 'Initials',
            page: 1,
            position: 'bottom center'
          });
          fields.push({
            type: 'date',
            name: 'Date',
            page: 1,
            position: 'bottom right'
          });
          break;

        default:
          throw new Error(`Unknown preset: ${preset}`);
      }

      // Use the smart field tool to add these fields
      return await this.addFieldSmart({ templateId, fields });

    } catch (error: any) {
      throw new Error(`Failed to apply preset: ${error.message}`);
    }
  }
}