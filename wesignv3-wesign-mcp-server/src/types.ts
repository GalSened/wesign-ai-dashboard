export interface WeSignConfig {
  apiUrl: string;
  email?: string;
  password?: string;
  persistent?: boolean;
}

export interface WeSignTokens {
  accessToken: string;
  refreshToken: string;
  authToken?: string;
}

export interface LoginResult {
  token: string;
  refreshToken: string;
  authToken?: string;
  success: boolean;
  message?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  companyId: string;
  companyName: string;
  groupName?: string;
  type: UserType;
  status: UserStatus;
  userConfiguration: UserConfiguration;
  program: ProfileProgram;
}

export interface UserConfiguration {
  language: number; // 1 = en, 2 = he
}

export interface ProfileProgram {
  expiredTime: string;
  remainingDocumentsForMonth: number;
}

export enum UserType {
  Basic = 1,
  Editor = 2,
  CompanyAdmin = 3
}

export enum UserStatus {
  Created = 0,
  Active = 1,
  Inactive = 2,
  Blocked = 3
}

export interface DocumentCollection {
  id: string;
  name: string;
  status: DocumentStatus;
  creationTime: string;
  documents: Document[];
  signers?: Signer[];
}

export interface Document {
  id: string;
  name: string;
  pagesCount: number;
  status: DocumentStatus;
  base64File?: string;
}

export enum DocumentStatus {
  Created = 0,
  InProgress = 1,
  Completed = 2,
  Cancelled = 3,
  Expired = 4
}

export interface Signer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  signingOrder: number;
  status: SignerStatus;
}

export enum SignerStatus {
  Pending = 0,
  InProgress = 1,
  Completed = 2,
  Declined = 3
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  status: TemplateStatus;
  base64File?: string;
  creationTime: string;
}

export enum TemplateStatus {
  Active = 1,
  Inactive = 2,
  OneTimeUse = 3
}

export interface SignatureField {
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  signerIndex?: number;
  fieldType: FieldType;
}

export enum FieldType {
  Signature = 1,
  Initial = 2,
  Text = 3,
  Date = 4,
  Checkbox = 5
}

export interface BaseResult {
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
  username?: string;
  language: number;
  sendActivationLink: boolean;
  reCAPCHA: string;
}

export interface UpdateUserDTO {
  name: string;
  email: string;
  phone?: string;
  userConfiguration: UserConfiguration;
}

export interface CreateSelfSignDocumentDTO {
  name: string;
  base64File: string;
  sourceTemplateId?: string;
}

export interface SelfSignCountResponseDTO {
  documentCollectionId: string;
  documentId: string;
  name: string;
  pagesCount: number;
}

export interface UpdateSelfSignDocumentDTO {
  documentCollectionId: string;
  documentId: string;
  fields?: SignatureField[];
  operation: typeof DocumentOperation[keyof typeof DocumentOperation];
}

export const DocumentOperation = {
  Save: 1,
  Decline: 2,
  Close: 3
} as const;

export interface SelfSignUpdateDocumentResult {
  success: boolean;
  downloadLink?: string;
  message?: string;
}

// Multi-party signing interfaces
export interface DocumentCollectionCreateRequest {
  documentMode: SignMode;
  documentName: string;
  templates: string[];
  senderNote?: string;
  signers: DocumentSigner[];
  readOnlyFields?: SignerField[];
  redirectUrl?: string;
  senderAppendices?: Appendix[];
  SharedAppendices?: SharedAppendix[];
  shouldSignUsingSigner1AfterDocumentSigningFlow?: boolean;
  shouldEnableMeaningOfSignature?: boolean;
}

export interface DocumentSigner {
  contactId?: string;
  sendingMethod: SendingMethod;
  contactMeans: string;
  contactName: string;
  sealId?: string;
  signerFields?: SignerField[];
  signerAttachments?: Attachment[];
  linkExpirationInHours?: number;
  senderNote?: string;
  senderAppendices?: Appendix[];
  otpIdentification?: string;
  otpMode?: OtpMode;
  authenticationMode?: AuthMode;
  phoneExtension?: string;
}

export interface SignerField {
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  fieldType: FieldType;
  signerIndex?: number;
  value?: string;
  isRequired?: boolean;
}

export interface Attachment {
  name: string;
  base64File: string;
  description?: string;
}

export interface Appendix {
  name: string;
  base64File: string;
  description?: string;
}

export interface SharedAppendix {
  name: string;
  base64File: string;
  description?: string;
}

export interface SimpleDocument {
  templateId: string;
  documentName: string;
  signerMeans: string;
  signerName: string;
  redirectUrl?: string;
}

export enum SignMode {
  SigningFlow = 1,
  SimpleSigning = 2
}

export enum SendingMethod {
  SMS = 1,      // ✅ CORRECTED: SMS is 1 (confirmed by API)
  Email = 2,    // ✅ CORRECTED: Email is 2 (confirmed by API)
  WhatsApp = 3  // Tablet/WhatsApp is 3
}

export enum OtpMode {
  None = 0,
  SMS = 1,
  Email = 2
}

export enum AuthMode {
  None = 0,
  Israeli_ID = 1,
  Passport = 2,
  Driver_License = 3
}
// PDF Fields structures for template updates
export interface PDFFields {
  textFields?: TextField[];
  signatureFields?: PDFSignatureField[];
  radioGroupFields?: RadioGroupField[];
  checkBoxFields?: CheckBoxField[];
  choiceFields?: ChoiceField[];
}

export interface PDFSignatureField {
  name?: string;
  description?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  mandatory?: boolean;
  page: number;  // 1-based page number
  image?: string;
  signingType?: SignatureFieldType;
}

export interface TextField {
  name: string;
  description?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  mandatory?: boolean;
  page: number;
  value?: string;
  textFieldType?: FieldType; // 3 = Text, 4 = Date
}

export interface CheckBoxField {
  name: string;
  description?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  mandatory?: boolean;
  page: number;
  isChecked?: boolean;
}

export interface ChoiceField {
  name: string;
  description?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  mandatory?: boolean;
  page: number;
  options?: string[];
  selectedOption?: string;
}

export interface RadioGroupField {
  name: string;
  radioFields: RadioField[];
  selectedRadioName?: string;
}

export interface RadioField {
  name: string;
  description?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  mandatory?: boolean;
  page: number;
  isDefault?: boolean;
  value?: string;
  groupName?: string;
}

export enum SignatureFieldType {
  Draw = 1,
  Type = 2,
  Graphic = 3
}

export interface UpdateTemplateFieldsDTO {
  templateId: string;
  fields: PDFFields;
}

// Contact Management
export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  groupId?: string;
  creationTime?: string;
}

export interface ContactGroup {
  id: string;
  name: string;
  description?: string;
  contactsCount?: number;
  creationTime?: string;
}

export interface CreateContactDTO {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  groupId?: string;
}

export interface UpdateContactDTO {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  groupId?: string;
}

export interface CreateContactGroupDTO {
  name: string;
  description?: string;
  contactIds?: string[];
}

export interface UpdateContactGroupDTO {
  id: string;
  name: string;
  description?: string;
  contactIds?: string[];
}
