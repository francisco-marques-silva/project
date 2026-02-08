const { GoogleGenAI } = require('@google/genai');
const config = require('../../core/config');

class GeminiProvider {
  constructor() {
    this.apiKey = config.llm.gemini.apiKey;
    this.client = this.apiKey ? new GoogleGenAI({ apiKey: this.apiKey }) : null;
    this.models = ['gemini-3-pro-preview', 'gemini-3-flash-preview'];
    this.defaultModel = config.llm.gemini.defaultModel;
  }

  isAvailable() {
    return !!this.apiKey;
  }

  async call(prompt, options = {}) {
    if (!this.client) throw new Error('Gemini API key not configured');

    const model = options.model || this.defaultModel;

    const config = {
      temperature: options.temperature ?? 0.1,
      maxOutputTokens: options.maxTokens || 2000,
    };

    if (options.jsonMode) {
      config.responseMimeType = 'application/json';
    }

    const systemInstruction = options.systemPrompt || 'You are a scientific article screening assistant.';

    const response = await this.client.models.generateContent({
      model,
      contents: prompt,
      config: {
        ...config,
        systemInstruction
      }
    });

    const content = response.text || '';

    return {
      content,
      model,
      provider: 'gemini',
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || null,
        completionTokens: response.usageMetadata?.candidatesTokenCount || null,
        totalTokens: response.usageMetadata?.totalTokenCount || null
      }
    };
  }

  async testConnection() {
    try {
      const result = await this.call('Reply with "OK" if you can read this.', {
        maxTokens: 10
      });
      return { success: true, message: result.content };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = GeminiProvider;
