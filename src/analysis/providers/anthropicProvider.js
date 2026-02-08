const Anthropic = require('@anthropic-ai/sdk');
const config = require('../../core/config');

class AnthropicProvider {
  constructor() {
    this.apiKey = config.llm.anthropic.apiKey;
    this.client = this.apiKey ? new Anthropic({ apiKey: this.apiKey }) : null;
    this.models = ['claude-opus-4-6', 'claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001'];
    this.defaultModel = config.llm.anthropic.defaultModel;
  }

  isAvailable() {
    return !!this.apiKey;
  }

  async call(prompt, options = {}) {
    if (!this.client) throw new Error('Anthropic API key not configured');

    const model = options.model || this.defaultModel;
    const temperature = options.temperature ?? 0.1;

    const response = await this.client.messages.create({
      model,
      max_tokens: options.maxTokens || 2000,
      temperature,
      system: options.systemPrompt || 'You are a scientific article screening assistant.',
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const content = response.content[0]?.text || '';
    return {
      content,
      model,
      provider: 'anthropic',
      usage: {
        promptTokens: response.usage?.input_tokens,
        completionTokens: response.usage?.output_tokens,
        totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
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

module.exports = AnthropicProvider;
