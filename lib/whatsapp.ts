interface WhatsAppMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "template" | "text";
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: string;
      parameters: Array<{
        type: string;
        parameter_name?: string;
        text: string;
      }>;
    }>;
  };
  text?: {
    body: string;
  };
}

interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  apiVersion: string;
}

export class WhatsAppService {
  private config: WhatsAppConfig;
  private baseUrl: string;

  constructor() {
    this.config = {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v22.0'
    };
    this.baseUrl = `https://graph.facebook.com/${this.config.apiVersion}`;
  }

  private validateConfig(): boolean {
    return !!(this.config.phoneNumberId && this.config.accessToken);
  }

  async sendTemplateMessage(to: string, templateName: string = 'hello_world', languageCode: string = 'en_US'): Promise<boolean> {
    if (!this.validateConfig()) {
      return false;
    }

    const message: WhatsAppMessage = {
      messaging_product: "whatsapp",
      to: to,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: languageCode
        }
      }
    };

    try {
      const response = await fetch(`${this.baseUrl}/${this.config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        const errorData = await response.json();
        return false;
      }

      const result = await response.json();
      return true;
    } catch (error) {
      return false;
    }
  }

  async sendParameterizedTemplateMessage(
    to: string, 
    parameters: { 
      first_name: string; 
      last_name: string; 
      content: string; 
      sender_name: string; 
    },
    languageCode: string = 'en'
  ): Promise<boolean> {
    if (!this.validateConfig()) {
      return false;
    }

    const message: WhatsAppMessage = {
      messaging_product: "whatsapp",
      to: to,
      type: "template",
      template: {
        name: "reminder",
        language: {
          code: languageCode
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                parameter_name: "first_name",
                text: parameters.first_name
              },
              {
                type: "text",
                parameter_name: "last_name",
                text: parameters.last_name
              },
              {
                type: "text",
                parameter_name: "content",
                text: parameters.content
              },
              {
                type: "text",
                parameter_name: "sender_name",
                text: parameters.sender_name
              }
            ]
          }
        ]
      }
    };

    try {
      const response = await fetch(`${this.baseUrl}/${this.config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        const errorData = await response.json();
        return false;
      }

      const result = await response.json();
      return true;
    } catch (error) {
      return false;
    }
  }

  async sendTextMessage(to: string, text: string): Promise<boolean> {
    if (!this.validateConfig()) {
      return false;
    }

    const message: WhatsAppMessage = {
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: {
        body: text
      }
    };

    try {
      const response = await fetch(`${this.baseUrl}/${this.config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        const errorData = await response.json();
        return false;
      }

      const result = await response.json();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Method to send announcement notification
  async sendAnnouncementNotification(to: string, announcementContent: string, senderName: string): Promise<boolean> {
    const message = `📢 New Announcement from ${senderName}:\n\n${announcementContent}`;
    return await this.sendTextMessage(to, message);
  }
}

export const whatsappService = new WhatsAppService(); 