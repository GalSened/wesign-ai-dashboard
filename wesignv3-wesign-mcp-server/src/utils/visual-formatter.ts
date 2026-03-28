/**
 * Visual HTML Formatter for ChatGPT Responses
 * Creates beautiful, modern UI components that render in ChatGPT
 */

export class VisualFormatter {

  /**
   * Generate common CSS styles for consistent look
   */
  private static getBaseStyles(): string {
    return `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        .wesign-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          max-width: 100%;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          color: #fff;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 25px;
          padding-bottom: 20px;
          border-bottom: 2px solid rgba(255,255,255,0.2);
        }
        .logo {
          width: 50px;
          height: 50px;
          background: rgba(255,255,255,0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        .title {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .subtitle {
          font-size: 14px;
          opacity: 0.8;
          margin-top: 4px;
        }
        .card {
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 15px;
          border: 1px solid rgba(255,255,255,0.2);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        }
        .card-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .card-content {
          font-size: 14px;
          line-height: 1.6;
          opacity: 0.9;
        }
        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .badge-success {
          background: #10b981;
          color: #fff;
        }
        .badge-warning {
          background: #f59e0b;
          color: #fff;
        }
        .badge-error {
          background: #ef4444;
          color: #fff;
        }
        .badge-info {
          background: #3b82f6;
          color: #fff;
        }
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin-top: 20px;
        }
        .stat-card {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 15px;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.15);
        }
        .stat-value {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 5px;
        }
        .stat-label {
          font-size: 12px;
          opacity: 0.8;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(255,255,255,0.2);
          border-radius: 10px;
          overflow: hidden;
          margin: 10px 0;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #34d399);
          border-radius: 10px;
          transition: width 0.3s ease;
        }
        .list-item {
          background: rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .list-item-title {
          font-weight: 600;
          font-size: 15px;
        }
        .list-item-meta {
          font-size: 12px;
          opacity: 0.7;
          margin-top: 4px;
        }
        .icon {
          font-size: 20px;
          margin-right: 8px;
        }
        .action-button {
          background: rgba(255,255,255,0.2);
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          color: #fff;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .action-button:hover {
          background: rgba(255,255,255,0.3);
        }
        .timeline {
          position: relative;
          padding-left: 30px;
        }
        .timeline-item {
          position: relative;
          padding-bottom: 20px;
        }
        .timeline-item:before {
          content: '';
          position: absolute;
          left: -22px;
          top: 0;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #10b981;
          border: 3px solid rgba(255,255,255,0.3);
        }
        .timeline-item:after {
          content: '';
          position: absolute;
          left: -17px;
          top: 12px;
          width: 2px;
          height: calc(100% - 12px);
          background: rgba(255,255,255,0.2);
        }
        .timeline-item:last-child:after {
          display: none;
        }
        .footer {
          margin-top: 25px;
          padding-top: 20px;
          border-top: 2px solid rgba(255,255,255,0.2);
          text-align: center;
          opacity: 0.7;
          font-size: 12px;
        }
      </style>
    `;
  }

  /**
   * Format authentication success response
   */
  static formatAuthSuccess(user: any): string {
    return `
      ${this.getBaseStyles()}
      <div class="wesign-container">
        <div class="header">
          <div class="logo">✓</div>
          <div>
            <div class="title">Authentication Successful</div>
            <div class="subtitle">Welcome back to WeSign</div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span class="icon">👤</span>
            User Information
          </div>
          <div class="card-content">
            <strong>${user.name}</strong><br/>
            <span style="opacity: 0.8">${user.email}</span>
            ${user.companyName ? `<br/><span style="opacity: 0.7">🏢 ${user.companyName}</span>` : ''}
          </div>
        </div>

        ${user.program ? `
          <div class="stat-grid">
            <div class="stat-card">
              <div class="stat-value">${user.program.remainingDocumentsForMonth || 0}</div>
              <div class="stat-label">Documents Left</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${user.program.currentMonthDocumentsCount || 0}</div>
              <div class="stat-label">Used This Month</div>
            </div>
          </div>
        ` : ''}

        <div class="footer">
          🔐 Secure connection established • Session active
        </div>
      </div>
    `;
  }

  /**
   * Format document list with modern cards
   */
  static formatDocumentList(documents: any[], total: number): string {
    const docCards = documents.map(doc => {
      const statusBadge = this.getStatusBadge(doc.status);
      const date = new Date(doc.createdOn).toLocaleDateString();

      return `
        <div class="list-item">
          <div>
            <div class="list-item-title">📄 ${doc.name || 'Untitled Document'}</div>
            <div class="list-item-meta">${date} • ${doc.documents?.length || 0} file(s)</div>
          </div>
          <div>
            ${statusBadge}
          </div>
        </div>
      `;
    }).join('');

    return `
      ${this.getBaseStyles()}
      <div class="wesign-container">
        <div class="header">
          <div class="logo">📋</div>
          <div>
            <div class="title">Document Collections</div>
            <div class="subtitle">${total} total collections found</div>
          </div>
        </div>

        ${docCards || '<div class="card"><div class="card-content">No documents found</div></div>'}

        <div class="footer">
          WeSign Document Management • Real-time status
        </div>
      </div>
    `;
  }

  /**
   * Format template list
   */
  static formatTemplateList(templates: any[], total: number): string {
    const templateCards = templates.map(tmpl => {
      const date = new Date(tmpl.createdOn).toLocaleDateString();
      const usageCount = tmpl.usageCount || 0;

      return `
        <div class="list-item">
          <div>
            <div class="list-item-title">📝 ${tmpl.name || 'Untitled Template'}</div>
            <div class="list-item-meta">Created ${date} • Used ${usageCount} times</div>
            ${tmpl.description ? `<div class="list-item-meta" style="margin-top: 6px; opacity: 0.8">${tmpl.description}</div>` : ''}
          </div>
          <div>
            <span class="badge badge-info">${tmpl.id}</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      ${this.getBaseStyles()}
      <div class="wesign-container">
        <div class="header">
          <div class="logo">📑</div>
          <div>
            <div class="title">Document Templates</div>
            <div class="subtitle">${total} templates available</div>
          </div>
        </div>

        ${templateCards || '<div class="card"><div class="card-content">No templates found</div></div>'}

        <div class="footer">
          WeSign Templates • Reusable document workflows
        </div>
      </div>
    `;
  }

  /**
   * Format document creation success
   */
  static formatDocumentCreated(result: any): string {
    return `
      ${this.getBaseStyles()}
      <div class="wesign-container">
        <div class="header">
          <div class="logo">🎉</div>
          <div>
            <div class="title">Document Created Successfully</div>
            <div class="subtitle">Ready for signature workflow</div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span class="icon">📄</span>
            Document Details
          </div>
          <div class="card-content">
            <strong>Collection ID:</strong> ${result.documentCollectionId}<br/>
            <strong>Document ID:</strong> ${result.documentId}<br/>
            ${result.name ? `<strong>Name:</strong> ${result.name}<br/>` : ''}
            <span class="badge badge-success" style="margin-top: 10px">CREATED</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span class="icon">➡️</span>
            Next Steps
          </div>
          <div class="card-content">
            <div class="timeline">
              <div class="timeline-item">
                <strong>Add Signature Fields</strong><br/>
                <span style="opacity: 0.8; font-size: 13px">Use wesign_add_signature_fields to position signature areas</span>
              </div>
              <div class="timeline-item">
                <strong>Complete Signing</strong><br/>
                <span style="opacity: 0.8; font-size: 13px">Use wesign_complete_signing to finalize the document</span>
              </div>
            </div>
          </div>
        </div>

        <div class="footer">
          ✅ Document ready for signature configuration
        </div>
      </div>
    `;
  }

  /**
   * Format document sent for signature
   */
  static formatDocumentSent(result: any, signers?: any[]): string {
    const signersList = signers?.map(s => `
      <div class="list-item">
        <div>
          <div class="list-item-title">${s.contactName}</div>
          <div class="list-item-meta">${s.contactMeans}</div>
        </div>
        <div>
          <span class="badge badge-info">${s.sendingMethod === 1 ? 'SMS' : s.sendingMethod === 2 ? 'EMAIL' : 'WHATSAPP'}</span>
        </div>
      </div>
    `).join('') || '';

    return `
      ${this.getBaseStyles()}
      <div class="wesign-container">
        <div class="header">
          <div class="logo">🚀</div>
          <div>
            <div class="title">Document Sent for Signature</div>
            <div class="subtitle">Signers have been notified</div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span class="icon">📨</span>
            Delivery Status
          </div>
          <div class="card-content">
            <span class="badge badge-success">SENT</span>
            <div style="margin-top: 15px; opacity: 0.9">
              Your document has been successfully sent to all signers.
              They will receive notifications via their selected method.
            </div>
          </div>
        </div>

        ${signersList ? `
          <div class="card">
            <div class="card-title">
              <span class="icon">👥</span>
              Signers (${signers?.length || 0})
            </div>
            <div class="card-content">
              ${signersList}
            </div>
          </div>
        ` : ''}

        <div class="footer">
          📬 Notifications delivered • Tracking enabled
        </div>
      </div>
    `;
  }

  /**
   * Format error response
   */
  static formatError(error: string, hint?: string): string {
    return `
      ${this.getBaseStyles()}
      <div class="wesign-container" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
        <div class="header">
          <div class="logo">⚠️</div>
          <div>
            <div class="title">Operation Failed</div>
            <div class="subtitle">An error occurred</div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            <span class="icon">❌</span>
            Error Details
          </div>
          <div class="card-content">
            ${error}
          </div>
        </div>

        ${hint ? `
          <div class="card">
            <div class="card-title">
              <span class="icon">💡</span>
              Suggestion
            </div>
            <div class="card-content">
              ${hint}
            </div>
          </div>
        ` : ''}

        <div class="footer">
          ℹ️ If the error persists, check your credentials and try again
        </div>
      </div>
    `;
  }

  /**
   * Get status badge HTML
   */
  private static getStatusBadge(status: number): string {
    const statusMap: Record<number, { text: string; class: string }> = {
      0: { text: 'DRAFT', class: 'badge-info' },
      1: { text: 'PENDING', class: 'badge-warning' },
      2: { text: 'COMPLETED', class: 'badge-success' },
      3: { text: 'CANCELLED', class: 'badge-error' },
    };

    const statusInfo = statusMap[status] || { text: 'UNKNOWN', class: 'badge-info' };
    return `<span class="badge ${statusInfo.class}">${statusInfo.text}</span>`;
  }

  /**
   * Format generic success message
   */
  static formatSuccess(message: string, details?: any): string {
    return `
      ${this.getBaseStyles()}
      <div class="wesign-container" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
        <div class="header">
          <div class="logo">✅</div>
          <div>
            <div class="title">Success</div>
            <div class="subtitle">${message}</div>
          </div>
        </div>

        ${details ? `
          <div class="card">
            <div class="card-content">
              <pre style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 12px; font-family: 'Courier New', monospace;">${JSON.stringify(details, null, 2)}</pre>
            </div>
          </div>
        ` : ''}

        <div class="footer">
          ✨ Operation completed successfully
        </div>
      </div>
    `;
  }
}
