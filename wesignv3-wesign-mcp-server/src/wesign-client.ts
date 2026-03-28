import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import type {
  WeSignConfig,
  WeSignTokens,
  LoginResult,
  User,
  DocumentCollection,
  Template,
  BaseResult,
  CreateSelfSignDocumentDTO,
  SelfSignCountResponseDTO,
  UpdateSelfSignDocumentDTO,
  SelfSignUpdateDocumentResult,
  CreateUserDTO,
  UpdateUserDTO,
  DocumentCollectionCreateRequest,
  SimpleDocument,
  DocumentSigner,
  SendingMethod,
  Contact,
  ContactGroup,
  CreateContactDTO,
  UpdateContactDTO,
  CreateContactGroupDTO,
  UpdateContactGroupDTO
} from './types.js';

export class WeSignClient {
  private apiUrl: string;
  private httpClient: AxiosInstance;
  private tokens: WeSignTokens | null = null;

  constructor(config: WeSignConfig) {
    this.apiUrl = config.apiUrl.replace(/\/$/, ''); // Remove trailing slash

    this.httpClient = axios.create({
      baseURL: `${this.apiUrl}/userapi/v3`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor for authentication and debugging
    this.httpClient.interceptors.request.use((config) => {
      // Log full request details for debugging
      console.error('=== Axios Request Debug ===');
      console.error('Method:', config.method?.toUpperCase());
      console.error('Full URL:', `${config.baseURL}${config.url}`);
      console.error('Headers:', JSON.stringify(config.headers, null, 2));
      console.error('Data:', JSON.stringify(config.data, null, 2));
      console.error('========================');

      if (this.tokens?.accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${this.tokens.accessToken}`;
      }
      return config;
    });

    // Add response interceptor for token refresh and error logging
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Log detailed error information for all errors
        console.error('=== Axios Response Error Debug ===');
        console.error('Method:', error.config?.method?.toUpperCase());
        console.error('URL:', `${error.config?.baseURL}${error.config?.url}`);
        console.error('Status:', error.response?.status);
        console.error('Status Text:', error.response?.statusText);
        console.error('Response Headers:', JSON.stringify(error.response?.headers, null, 2));
        console.error('Response Data:', JSON.stringify(error.response?.data, null, 2));
        console.error('Error Message:', error.message);
        console.error('===================================');

        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry && this.tokens?.refreshToken) {
          originalRequest._retry = true;

          try {
            await this.refreshToken();
            if (this.tokens?.accessToken) {
              originalRequest.headers.Authorization = `Bearer ${this.tokens.accessToken}`;
              return this.httpClient(originalRequest);
            }
          } catch (refreshError) {
            this.tokens = null;
            throw refreshError;
          }
        }

        throw error;
      }
    );
  }

  // Authentication Methods
  async login(email: string, password: string, persistent: boolean = false): Promise<LoginResult> {
    try {
      const response = await this.httpClient.post<any>('/Users/Login', {
        email: email,
        password: password
      });

      // Debug: Log response structure
      console.error('=== Login Response Debug ===');
      console.error('Status:', response.status);
      console.error('Headers:', JSON.stringify(response.headers, null, 2));
      console.error('Data:', JSON.stringify(response.data, null, 2));
      console.error('===========================');

      // Handle actual API response format (no "success" field)
      if (response.data.token) {
        this.tokens = {
          accessToken: response.data.token,
          refreshToken: response.data.refreshToken,
          authToken: response.data.authToken || ''
        };

        console.error('Tokens set:', {
          hasAccessToken: !!this.tokens.accessToken,
          hasRefreshToken: !!this.tokens.refreshToken,
          isAuth: this.isAuthenticated()
        });

        return {
          success: true,
          token: response.data.token,
          refreshToken: response.data.refreshToken,
          authToken: response.data.authToken || '',
          message: 'Login successful'
        };
      }

      console.error('No token in response!');
      return {
        success: false,
        message: 'Login failed: no token received',
        token: '',
        refreshToken: '',
        authToken: ''
      };
    } catch (error: any) {
      console.error('=== Login Error Debug ===');
      console.error('Error status:', error.response?.status);
      console.error('Error statusText:', error.response?.statusText);
      console.error('Error headers:', JSON.stringify(error.response?.headers, null, 2));
      console.error('Error data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Error message:', error.message);
      console.error('========================');
      throw new Error(`Login failed: ${this.getErrorMessage(error)}`);
    }
  }

  async refreshToken(): Promise<void> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.httpClient.post('/users/refresh', {
        JwtToken: this.tokens.accessToken,
        RefreshToken: this.tokens.refreshToken,
        AuthToken: this.tokens.authToken
      });

      if (response.data.token) {
        this.tokens.accessToken = response.data.token;
      }
    } catch (error) {
      this.tokens = null;
      throw new Error(`Token refresh failed: ${this.getErrorMessage(error)}`);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.httpClient.get('/users/Logout');
    } catch (error) {
      // Ignore logout errors, clear tokens anyway
    } finally {
      this.tokens = null;
    }
  }

  // User Management Methods
  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.httpClient.get<User>('/users');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get current user: ${this.getErrorMessage(error)}`);
    }
  }

  async updateUser(user: UpdateUserDTO): Promise<BaseResult> {
    try {
      const response = await this.httpClient.put<BaseResult>('/users', user);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update user: ${this.getErrorMessage(error)}`);
    }
  }

  async signUp(user: CreateUserDTO): Promise<{ link: string }> {
    try {
      const response = await this.httpClient.post<{ link: string }>('/users', user);
      return response.data;
    } catch (error) {
      throw new Error(`Sign up failed: ${this.getErrorMessage(error)}`);
    }
  }

  // Self-Sign Document Methods
  async createSelfSignDocument(document: CreateSelfSignDocumentDTO): Promise<SelfSignCountResponseDTO> {
    try {
      const response = await this.httpClient.post<SelfSignCountResponseDTO>('/selfsign', document);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create self-sign document: ${this.getErrorMessage(error)}`);
    }
  }

  async updateSelfSignDocument(update: UpdateSelfSignDocumentDTO): Promise<SelfSignUpdateDocumentResult> {
    try {
      const response = await this.httpClient.put<SelfSignUpdateDocumentResult>('/selfsign', update);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update self-sign document: ${this.getErrorMessage(error)}`);
    }
  }

  async getSelfSignDocument(documentCollectionId: string): Promise<DocumentCollection> {
    try {
      const response = await this.httpClient.get<DocumentCollection>(`/selfsign/${documentCollectionId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get self-sign document: ${this.getErrorMessage(error)}`);
    }
  }

  // Document Collection Methods
  async getDocumentCollections(offset: number = 0, limit: number = 50): Promise<DocumentCollection[]> {
    try {
      const response = await this.httpClient.get<any>('/documentcollections', {
        params: { offset, limit }
      });

      // Handle different API response formats
      let collections: any;
      if (Array.isArray(response.data)) {
        // Direct array response
        collections = response.data;
      } else if (response.data && typeof response.data === 'object') {
        // Object with nested array - try common property names
        collections = response.data.documentCollections ||
                     response.data.collections ||
                     response.data.data ||
                     response.data.items ||
                     [];
      } else {
        collections = [];
      }

      // Ensure we return an array
      return Array.isArray(collections) ? collections : [];
    } catch (error) {
      throw new Error(`Failed to get document collections: ${this.getErrorMessage(error)}`);
    }
  }

  async getDocumentCollection(id: string): Promise<DocumentCollection> {
    try {
      const response = await this.httpClient.get<DocumentCollection>(`/documentcollections/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get document collection: ${this.getErrorMessage(error)}`);
    }
  }

  async createDocumentCollection(name: string, base64Files: string[]): Promise<DocumentCollection> {
    try {
      const response = await this.httpClient.post<DocumentCollection>('/documentcollections', {
        Name: name,
        Base64Files: base64Files
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create document collection: ${this.getErrorMessage(error)}`);
    }
  }

  async downloadDocument(documentCollectionId: string, documentId: string): Promise<{ base64File: string; fileName: string }> {
    try {
      const response = await this.httpClient.get(`/documentcollections/${documentCollectionId}/documents/${documentId}/download`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to download document: ${this.getErrorMessage(error)}`);
    }
  }

  // Template Methods
  async getTemplates(offset: number = 0, limit: number = 50): Promise<Template[]> {
    try {
      const response = await this.httpClient.get<any>('/templates', {
        params: { offset, limit }
      });
      // API returns { Templates: [...] } structure
      return response.data.Templates || response.data.templates || [];
    } catch (error) {
      throw new Error(`Failed to get templates: ${this.getErrorMessage(error)}`);
    }
  }

  async getTemplate(id: string): Promise<Template> {
    try {
      const response = await this.httpClient.get<Template>(`/templates/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get template: ${this.getErrorMessage(error)}`);
    }
  }

  async downloadTemplate(id: string): Promise<Buffer> {
    try {
      const response = await this.httpClient.get(`/templates/${id}/download`, {
        responseType: 'arraybuffer'
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Failed to download template: ${this.getErrorMessage(error)}`);
    }
  }

  async createTemplate(name: string, base64File: string, description?: string): Promise<Template> {
    try {
      const response = await this.httpClient.post<any>('/templates', {
        Name: name,
        Base64File: base64File,
        Description: description
      });
      // Map API response to Template interface
      return {
        id: response.data.templateId,
        name: response.data.templateName,
        description: response.data.description,
        status: response.data.status || 1,
        creationTime: response.data.creationTime,
        base64File: response.data.base64File
      };
    } catch (error) {
      throw new Error(`Failed to create template: ${this.getErrorMessage(error)}`);
    }
  }

  async updateTemplateFields(templateId: string, fields: import('./types.js').PDFFields): Promise<void> {
    try {
      // PDF page dimensions in points (US Letter: 8.5" x 11")
      const PAGE_WIDTH = 612;
      const PAGE_HEIGHT = 792;

      // Normalize coordinates to 0-1 range
      const normalizeCoord = (value: number, dimension: number): number => {
        return Math.max(0, Math.min(1, value / dimension));
      };

      // Convert to PascalCase for C# API
      const apiRequest = {
        Name: 'Updated Template', // Name is required
        Fields: {
          TextFields: fields.textFields?.map(f => ({
            Name: f.name,
            Description: f.description || '',
            X: normalizeCoord(f.x, PAGE_WIDTH),
            Y: normalizeCoord(f.y, PAGE_HEIGHT),
            Width: normalizeCoord(f.width, PAGE_WIDTH),
            Height: normalizeCoord(f.height, PAGE_HEIGHT),
            Mandatory: f.mandatory ?? false,
            Page: f.page,
            Value: f.value || '',
            TextFieldType: f.textFieldType ?? 3 // 3 = Text, 4 = Date
          })) || [],
          SignatureFields: fields.signatureFields?.map(f => ({
            Name: f.name,
            Description: f.description || '',
            X: normalizeCoord(f.x, PAGE_WIDTH),
            Y: normalizeCoord(f.y, PAGE_HEIGHT),
            Width: normalizeCoord(f.width, PAGE_WIDTH),
            Height: normalizeCoord(f.height, PAGE_HEIGHT),
            Mandatory: f.mandatory ?? false,
            Page: f.page,
            Image: f.image || '',
            SigningType: f.signingType ?? 3 // Default to Graphic
          })) || [],
          RadioGroupFields: fields.radioGroupFields?.map(g => ({
            Name: g.name,
            RadioFields: g.radioFields?.map(f => ({
              Name: f.name,
              Description: f.description || '',
              X: normalizeCoord(f.x, PAGE_WIDTH),
              Y: normalizeCoord(f.y, PAGE_HEIGHT),
              Width: normalizeCoord(f.width, PAGE_WIDTH),
              Height: normalizeCoord(f.height, PAGE_HEIGHT),
              Mandatory: f.mandatory ?? false,
              Page: f.page,
              IsDefault: f.isDefault ?? false,
              Value: f.value || '',
              GroupName: f.groupName || ''
            })) || [],
            SelectedRadioName: g.selectedRadioName || ''
          })) || [],
          CheckBoxFields: fields.checkBoxFields?.map(f => ({
            Name: f.name,
            Description: f.description || '',
            X: normalizeCoord(f.x, PAGE_WIDTH),
            Y: normalizeCoord(f.y, PAGE_HEIGHT),
            Width: normalizeCoord(f.width, PAGE_WIDTH),
            Height: normalizeCoord(f.height, PAGE_HEIGHT),
            Mandatory: f.mandatory ?? false,
            Page: f.page,
            IsChecked: f.isChecked ?? false
          })) || [],
          ChoiceFields: fields.choiceFields?.map(f => ({
            Name: f.name,
            Description: f.description || '',
            X: normalizeCoord(f.x, PAGE_WIDTH),
            Y: normalizeCoord(f.y, PAGE_HEIGHT),
            Width: normalizeCoord(f.width, PAGE_WIDTH),
            Height: normalizeCoord(f.height, PAGE_HEIGHT),
            Mandatory: f.mandatory ?? false,
            Page: f.page,
            Options: f.options || [],
            SelectedOption: f.selectedOption || ''
          })) || []
        }
      };

      console.error('Updating template fields:', JSON.stringify(apiRequest, null, 2));
      await this.httpClient.put(`/templates/${templateId}`, apiRequest);
    } catch (error: any) {
      // Log full error response for debugging
      console.error('Template update error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: JSON.stringify(error.response?.data, null, 2),
        headers: error.response?.headers
      });
      throw new Error(`Failed to update template fields: ${this.getErrorMessage(error)}`);
    }
  }

  // Multi-party signing methods
  async sendDocumentForSignature(request: DocumentCollectionCreateRequest): Promise<DocumentCollection> {
    try {
      // Convert to PascalCase for C# API
      const apiRequest = {
        DocumentMode: request.documentMode,
        DocumentName: request.documentName,
        Templates: request.templates,
        SenderNote: request.senderNote,
        RediretUrl: request.redirectUrl, // Note: API has typo "RediretUrl"
        Signers: request.signers.map(signer => ({
          ContactId: signer.contactId || '00000000-0000-0000-0000-000000000000',
          SendingMethod: signer.sendingMethod,
          ContactMeans: signer.contactMeans,
          ContactName: signer.contactName,
          PhoneExtension: signer.phoneExtension || '+972',
          SignerFields: signer.signerFields?.map(field => ({
            X: field.x,
            Y: field.y,
            Width: field.width,
            Height: field.height,
            PageNumber: field.pageNumber,
            FieldType: field.fieldType,
            SignerIndex: field.signerIndex,
            IsRequired: field.isRequired ?? true
          })),
          LinkExpirationInHours: signer.linkExpirationInHours || 168,
          SenderNote: signer.senderNote,
          OtpIdentification: signer.otpIdentification,
          OtpMode: signer.otpMode,
          AuthenticationMode: signer.authenticationMode
        })),
        ShouldSignUsingSigner1AfterDocumentSigningFlow: request.shouldSignUsingSigner1AfterDocumentSigningFlow,
        ShouldEnableMeaningOfSignature: request.shouldEnableMeaningOfSignature
      };

      const response = await this.httpClient.post<DocumentCollection>('/documentcollections', apiRequest);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to send document for signature: ${this.getErrorMessage(error)}`);
    }
  }

  async sendSimpleDocument(request: SimpleDocument): Promise<DocumentCollection> {
    try {
      const response = await this.httpClient.post<DocumentCollection>('/documentcollections/simple', request);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to send simple document: ${this.getErrorMessage(error)}`);
    }
  }

  async resendDocumentToSigner(documentCollectionId: string, signerId: string, sendingMethod: SendingMethod): Promise<BaseResult> {
    try {
      const response = await this.httpClient.get<BaseResult>(`/documentcollections/${documentCollectionId}/signers/${signerId}/method/${sendingMethod}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to resend document to signer: ${this.getErrorMessage(error)}`);
    }
  }

  async replaceSigner(documentCollectionId: string, signerId: string, newSigner: DocumentSigner): Promise<BaseResult> {
    try {
      const response = await this.httpClient.put<BaseResult>(`/documentcollections/${documentCollectionId}/signer/${signerId}/replace`, newSigner);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to replace signer: ${this.getErrorMessage(error)}`);
    }
  }

  async cancelDocumentCollection(documentCollectionId: string): Promise<BaseResult> {
    try {
      const response = await this.httpClient.put<BaseResult>(`/documentcollections/${documentCollectionId}/cancel`, '');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to cancel document collection: ${this.getErrorMessage(error)}`);
    }
  }

  async reactivateDocumentCollection(documentCollectionId: string): Promise<BaseResult> {
    try {
      const response = await this.httpClient.get<BaseResult>(`/documentcollections/${documentCollectionId}/reactivate`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to reactivate document collection: ${this.getErrorMessage(error)}`);
    }
  }

  async shareDocument(documentCollectionId: string, emails: string[], message?: string): Promise<BaseResult> {
    try {
      const response = await this.httpClient.post<BaseResult>('/documentcollections/share', {
        documentCollectionId,
        emails,
        message: message || ''
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to share document: ${this.getErrorMessage(error)}`);
    }
  }

  async getSenderLiveLink(documentCollectionId: string, signerId: string): Promise<{ liveLink: string }> {
    try {
      const response = await this.httpClient.get<{ liveLink: string }>(`/documentcollections/${documentCollectionId}/senderLink/${signerId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get sender live link: ${this.getErrorMessage(error)}`);
    }
  }

  // Distribution Methods
  async extractSignersFromExcel(base64File: string): Promise<any[]> {
    try {
      const response = await this.httpClient.post('/distribution/signers', {
        Base64File: base64File
      });
      return response.data.signers;
    } catch (error) {
      throw new Error(`Failed to extract signers from Excel: ${this.getErrorMessage(error)}`);
    }
  }

  // Contact Management Methods
  async createContact(dto: CreateContactDTO): Promise<Contact> {
    try {
      // Transform DTO to match API expectations
      const apiRequest: any = {
        Name: `${dto.firstName} ${dto.lastName}`.trim(),
        // Determine DefaultSendingMethod based on available contact info
        // 1 = SMS (if phone provided), 2 = Email (if email provided)
        DefaultSendingMethod: dto.phone ? 1 : (dto.email ? 2 : 1),
        Phone: dto.phone || '',
        PhoneExtension: '+972',
        SearchTag: dto.notes || '',
      };

      // Add optional fields if provided
      if (dto.email) apiRequest.Email = dto.email;
      if (dto.phone) apiRequest.Phone = dto.phone;
      if (dto.company) apiRequest.Company = dto.company;
      if (dto.notes) apiRequest.SearchTag = dto.notes; // API uses SearchTag for notes
      if (dto.groupId) apiRequest.GroupId = dto.groupId;

      const response = await this.httpClient.post<Contact>('/contacts', apiRequest);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create contact: ${this.getErrorMessage(error)}`);
    }
  }

  async createContactsBulk(contacts: CreateContactDTO[]): Promise<Contact[]> {
    try {
      // Transform each contact DTO to match API expectations
      const apiContacts = contacts.map(dto => {
        const apiRequest: any = {
          Name: `${dto.firstName} ${dto.lastName}`.trim(),
          DefaultSendingMethod: dto.phone ? 1 : (dto.email ? 2 : 1),
        };

        if (dto.email) apiRequest.Email = dto.email;
        if (dto.phone) apiRequest.Phone = dto.phone;
        if (dto.company) apiRequest.Company = dto.company;
        if (dto.notes) apiRequest.SearchTag = dto.notes;
        if (dto.groupId) apiRequest.GroupId = dto.groupId;

        return apiRequest;
      });

      const response = await this.httpClient.post<Contact[]>('/contacts/bulk', { contacts: apiContacts });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create contacts in bulk: ${this.getErrorMessage(error)}`);
    }
  }

  async listContacts(query?: string, groupId?: string, offset: number = 0, limit: number = 100): Promise<Contact[]> {
    try {
      const params: any = { offset, limit };
      if (query) params.query = query;
      if (groupId) params.groupId = groupId;

      const response = await this.httpClient.get<Contact[]>('/contacts', { params });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to list contacts: ${this.getErrorMessage(error)}`);
    }
  }

  async getContact(contactId: string): Promise<Contact> {
    try {
      const response = await this.httpClient.get<Contact>(`/contacts/${contactId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get contact: ${this.getErrorMessage(error)}`);
    }
  }

  async updateContact(contactId: string, dto: Omit<UpdateContactDTO, 'id'>): Promise<Contact> {
    try {
      const response = await this.httpClient.put<Contact>(`/contacts/${contactId}`, dto);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update contact: ${this.getErrorMessage(error)}`);
    }
  }

  async deleteContact(contactId: string): Promise<void> {
    try {
      await this.httpClient.delete(`/contacts/${contactId}`);
    } catch (error) {
      throw new Error(`Failed to delete contact: ${this.getErrorMessage(error)}`);
    }
  }

  async deleteContactsBatch(contactIds: string[]): Promise<void> {
    try {
      await this.httpClient.post('/contacts/batch-delete', { contactIds });
    } catch (error) {
      throw new Error(`Failed to delete contacts in batch: ${this.getErrorMessage(error)}`);
    }
  }

  async listContactGroups(offset: number = 0, limit: number = 100): Promise<ContactGroup[]> {
    try {
      const response = await this.httpClient.get<ContactGroup[]>('/contacts/group', {
        params: { offset, limit }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to list contact groups: ${this.getErrorMessage(error)}`);
    }
  }

  async getContactGroup(groupId: string): Promise<ContactGroup> {
    try {
      const response = await this.httpClient.get<ContactGroup>(`/contacts/group/${groupId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get contact group: ${this.getErrorMessage(error)}`);
    }
  }

  async createContactGroup(dto: CreateContactGroupDTO): Promise<ContactGroup> {
    try {
      const response = await this.httpClient.post<ContactGroup>('/contacts/group', dto);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create contact group: ${this.getErrorMessage(error)}`);
    }
  }

  async updateContactGroup(groupId: string, dto: Omit<UpdateContactGroupDTO, 'id'>): Promise<ContactGroup> {
    try {
      const response = await this.httpClient.put<ContactGroup>(`/contacts/group/${groupId}`, dto);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update contact group: ${this.getErrorMessage(error)}`);
    }
  }

  async deleteContactGroup(groupId: string): Promise<void> {
    try {
      await this.httpClient.delete(`/contacts/group/${groupId}`);
    } catch (error) {
      throw new Error(`Failed to delete contact group: ${this.getErrorMessage(error)}`);
    }
  }

  // Utility Methods
  isAuthenticated(): boolean {
    return this.tokens?.accessToken != null;
  }

  setTokens(tokens: WeSignTokens): void {
    this.tokens = tokens;
  }

  getTokens(): WeSignTokens | null {
    return this.tokens;
  }

  private getErrorMessage(error: any): string {
    const parts: string[] = [];

    // Add HTTP status code if available
    if (error.response?.status) {
      parts.push(`HTTP ${error.response.status}`);
      if (error.response.statusText) {
        parts.push(error.response.statusText);
      }
    }

    // Try to extract message from various response formats
    if (error.response?.data) {
      const data = error.response.data;

      // Check common message fields
      if (data.message) {
        parts.push(data.message);
      } else if (data.error) {
        parts.push(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
      } else if (data.Message) {
        parts.push(data.Message);
      } else if (data.Error) {
        parts.push(typeof data.Error === 'string' ? data.Error : JSON.stringify(data.Error));
      } else if (typeof data === 'string') {
        parts.push(data);
      } else {
        // Include full response body for debugging
        const dataStr = JSON.stringify(data);
        if (dataStr.length < 500) {
          parts.push(`Response: ${dataStr}`);
        } else {
          parts.push(`Response too large (${dataStr.length} chars)`);
        }
      }
    }

    // Add axios error message if available
    if (error.message && !parts.some(p => p.includes(error.message))) {
      parts.push(error.message);
    }

    return parts.length > 0 ? parts.join(' - ') : 'Unknown error occurred';
  }

  // ── New API Methods (v5.1) ──────────────────────────────────────

  async deleteDocumentCollection(id: string): Promise<void> {
    try {
      await this.httpClient.delete(`/documentcollections/${id}`);
    } catch (error) {
      throw new Error(`Failed to delete document: ${this.getErrorMessage(error)}`);
    }
  }

  async deleteDocumentsBatch(ids: string[]): Promise<void> {
    try {
      await this.httpClient.post('/documentcollections/batch-delete', { DocumentCollectionIds: ids });
    } catch (error) {
      throw new Error(`Failed to delete documents batch: ${this.getErrorMessage(error)}`);
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      await this.httpClient.delete(`/templates/${id}`);
    } catch (error) {
      throw new Error(`Failed to delete template: ${this.getErrorMessage(error)}`);
    }
  }

  async duplicateTemplate(id: string, newName: string): Promise<any> {
    try {
      const response = await this.httpClient.post<any>(`/templates/${id}/duplicate`, { Name: newName });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to duplicate template: ${this.getErrorMessage(error)}`);
    }
  }

  async getTemplatePageCount(templateId: string): Promise<number> {
    try {
      const response = await this.httpClient.get<any>(`/templates/${templateId}/pages`);
      return response.data?.pageCount || response.data?.PagesCount || response.data;
    } catch (error) {
      throw new Error(`Failed to get page count: ${this.getErrorMessage(error)}`);
    }
  }

  async getDocumentPageCount(collectionId: string, documentId: string): Promise<number> {
    try {
      const response = await this.httpClient.get<any>(`/documentcollections/${collectionId}/documents/${documentId}/pages`);
      return response.data?.pageCount || response.data?.PagesCount || response.data;
    } catch (error) {
      throw new Error(`Failed to get document page count: ${this.getErrorMessage(error)}`);
    }
  }

  async getSigningLinks(collectionId: string): Promise<any[]> {
    try {
      const response = await this.httpClient.get<any>(`/documentcollections/${collectionId}/DocumentCollectionLinks`);
      return response.data?.links || response.data?.Links || response.data || [];
    } catch (error) {
      throw new Error(`Failed to get signing links: ${this.getErrorMessage(error)}`);
    }
  }

  async exportPdfFields(collectionId: string): Promise<any> {
    try {
      const response = await this.httpClient.get<any>(`/documentcollections/${collectionId}/ExportPdfFields`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to export PDF fields: ${this.getErrorMessage(error)}`);
    }
  }

  async getUsageReport(from?: string, to?: string, statuses?: number[]): Promise<any> {
    try {
      const params: any = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (statuses) params.docStatuses = statuses;
      const response = await this.httpClient.get<any>('/reports/usage', { params });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get usage report: ${this.getErrorMessage(error)}`);
    }
  }

  async distributionMechanism(templateId: string, base64File: string): Promise<any> {
    try {
      const response = await this.httpClient.post<any>('/distribution/mechanism', {
        TemplateId: templateId,
        Base64File: base64File
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to bulk send: ${this.getErrorMessage(error)}`);
    }
  }
}