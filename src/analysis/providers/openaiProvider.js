const OpenAI = require('openai');
const config = require('../../core/config');

class OpenAIProvider {
  constructor() {
    this.apiKey = config.llm.openai.apiKey;
    this.client = this.apiKey ? new OpenAI({ apiKey: this.apiKey }) : null;
    this.models = ['gpt-5.2', 'gpt-5.2-pro', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4o'];
    this.defaultModel = config.llm.openai.defaultModel;
  }

  isAvailable() {
    return !!this.apiKey;
  }

  async call(prompt, options = {}) {
    if (!this.client) throw new Error('OpenAI API key not configured');

    const model = options.model || this.defaultModel;
    const temperature = options.temperature ?? 0.1;

    const response = await this.client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: options.systemPrompt || 'You are a scientific article screening assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature,
      max_completion_tokens: options.maxTokens || 2000,
      response_format: options.jsonMode ? { type: 'json_object' } : undefined
    });

    const content = response.choices[0]?.message?.content || '';
    return {
      content,
      model,
      provider: 'openai',
      usage: {
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens
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

module.exports = OpenAIProvider;
