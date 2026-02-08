const OpenAIProvider = require('./providers/openaiProvider');
const AnthropicProvider = require('./providers/anthropicProvider');
const GeminiProvider = require('./providers/geminiProvider');

const providers = {
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  gemini: new GeminiProvider()
};

function getProvider(name) {
  return providers[name] || null;
}

function getAvailableProviders() {
  return Object.entries(providers).map(([name, provider]) => ({
    name,
    available: provider.isAvailable(),
    models: provider.models,
    defaultModel: provider.defaultModel,
    label: {
      openai: 'OpenAI GPT',
      anthropic: 'Anthropic Claude',
      gemini: 'Google Gemini'
    }[name] || name
  }));
}

function getAvailableModels() {
  const models = [];
  for (const [providerName, provider] of Object.entries(providers)) {
    if (provider.isAvailable()) {
      for (const model of provider.models) {
        models.push({
          id: model,
          provider: providerName,
          isDefault: model === provider.defaultModel
        });
      }
    }
  }
  return models;
}

/**
 * Build the TIAB screening prompt based on the Python llm_caller.py prompt.
 * High-sensitivity screening with structured JSON output including
 * inclusion/exclusion evaluation per criterion.
 */
function buildScreeningPrompt(article, criteria) {
  const { pico_question, inclusion_criteria, exclusion_criteria } = criteria;

  // Parse criteria into arrays (may come as string or array)
  const incList = Array.isArray(inclusion_criteria)
    ? inclusion_criteria
    : (inclusion_criteria || '').split('\n').map(s => s.trim()).filter(Boolean);
  const excList = Array.isArray(exclusion_criteria)
    ? exclusion_criteria
    : (exclusion_criteria || '').split('\n').map(s => s.trim()).filter(Boolean);

  const incLines = incList.length > 0
    ? incList.map(c => `- ${c}`).join('\n')
    : '- (none provided)';
  const excLines = excList.length > 0
    ? excList.map(c => `- ${c}`).join('\n')
    : '- (none provided)';

  const title = article.title || '(no title)';
  const abstract = article.abstract || '(no abstract)';
  const synopsis = (pico_question || '').trim() || '(not provided)';

  return [
    'You are a knowledgeable AI assistant tasked with high-sensitivity title and abstract screening of a research article for a systematic review. Follow a step-by-step evaluation focusing on not missing any potentially relevant study.',
    '',
    `Synopsis/PICO: ${synopsis}`,
    '',
    'Inclusion Criteria:',
    incLines,
    '',
    'Exclusion Criteria:',
    excLines,
    '',
    `Study Title: ${title}`,
    `Study Abstract: ${abstract}`,
    '',
    'Instructions:',
    '1. Identify PICO elements and type record from the title and abstract: determine the studied population (animals/population), intervention/exposure and type of record (review, systematic review, original research article, case report).',
    '2. Check each inclusion criterion against the information: for each inclusion criterion, assess whether the abstract suggests the study fulfills it. (Treat unspecified details as uncertain rather than negative.)',
    '3. Check each exclusion criterion: assess if any exclusion criterion is clearly met by the study.',
    '4. Perform the above reasoning internally – do not output these steps.',
    '',
    'Decision logic (high recall focus):',
    '- If all inclusion criteria are met and no exclusion criteria apply, Include the study.',
    '- If any inclusion criterion is clearly unmet or any exclusion criterion is definitely met, decide Exclude',
    '- If there is any uncertainty (e.g. some PICO elements are unclear from the abstract) and no clear exclusion, mark as Maybe rather than risk wrongful exclusion.',
    '',
    'When in doubt, err on the side of inclusion (include or maybe).',
    '',
    'Output (JSON only): Return a single JSON object with keys:',
    '- decision: "include" | "exclude" | "maybe"',
    '- rationale: brief reason (<=12 words)',
    '- inclusion_evaluation: array of { "criterion": string, "status": "met"|"unclear"|"unmet" }',
    '- exclusion_evaluation: array of { "criterion": string, "status": "met"|"unclear"|"unmet" }',
    'No other text should be produced outside the JSON.',
    '',
    'Example format:',
    '{',
    '  "decision": "maybe",',
    '  "rationale": "Population matches, but intervention details unclear from abstract",',
    '  "inclusion_evaluation": [ { "criterion": "population: adults with T2D", "status": "met" } ],',
    '  "exclusion_evaluation": [ { "criterion": "non-human study", "status": "unmet" } ]',
    '}',
    '',
    "Now, based on the above criteria and the article's title/abstract, output the JSON decision."
  ].join('\n');
}

/**
 * Parse the LLM response JSON.
 * Handles code-fenced responses, malformed JSON, and fallback extraction.
 */
function parseScreeningResponse(content, incList, excList) {
  // Strip code fences
  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '').trim();
  }

  let parsed;
  try {
    // Try extracting JSON object from response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
  } catch (e) {
    // Fallback: extract decision from text
    const lower = cleaned.toLowerCase();
    let decision = 'maybe';
    if (lower.includes('include') && !lower.includes('exclude')) decision = 'include';
    else if (lower.includes('exclude') && !lower.includes('include')) decision = 'exclude';
    
    return {
      decision,
      rationale: cleaned.split('\n')[0].substring(0, 80),
      inclusion_evaluation: (incList || []).map(c => ({ criterion: c, status: 'unclear' })),
      exclusion_evaluation: (excList || []).map(c => ({ criterion: c, status: 'unclear' }))
    };
  }

  // Normalize decision
  let decision = String(parsed.decision || '').trim().toLowerCase();
  if (!['include', 'exclude', 'maybe'].includes(decision)) decision = 'maybe';

  // Normalize rationale
  let rationale = String(parsed.rationale || '').trim();
  if (rationale.split(/\s+/).length > 12) {
    rationale = rationale.split(/\s+/).slice(0, 12).join(' ');
  }
  if (!rationale) rationale = 'insufficient information';

  // Coerce evaluations
  function coerceEval(arr) {
    if (!arr || !Array.isArray(arr)) return [];
    return arr.filter(it => it && typeof it === 'object').map(it => ({
      criterion: String(it.criterion || '').trim(),
      status: ['met', 'unclear', 'unmet'].includes(String(it.status || '').toLowerCase())
        ? String(it.status).toLowerCase()
        : 'unclear'
    })).filter(it => it.criterion);
  }

  const incEval = coerceEval(
    parsed.inclusion_evaluation || parsed.inclusionEvaluations || parsed.inclusion || []
  );
  const excEval = coerceEval(
    parsed.exclusion_evaluation || parsed.exclusionEvaluations || parsed.exclusion || []
  );

  return {
    decision,
    rationale,
    inclusion_evaluation: incEval.length > 0 ? incEval : (incList || []).map(c => ({ criterion: c, status: 'unclear' })),
    exclusion_evaluation: excEval.length > 0 ? excEval : (excList || []).map(c => ({ criterion: c, status: 'unclear' }))
  };
}

async function screenArticle(article, criteria, providerName, modelName) {
  const provider = getProvider(providerName);
  if (!provider) throw new Error(`Provider '${providerName}' not found`);
  if (!provider.isAvailable()) throw new Error(`Provider '${providerName}' not configured`);

  const prompt = buildScreeningPrompt(article, criteria);

  const result = await provider.call(prompt, {
    model: modelName,
    jsonMode: providerName !== 'anthropic',
    temperature: 0.1,
    maxTokens: 1500,
    systemPrompt: 'You are a systematic review screening expert. Always respond with valid JSON only.'
  });

  // Parse inclusion/exclusion lists for evaluation fallback
  const { inclusion_criteria, exclusion_criteria } = criteria;
  const incList = Array.isArray(inclusion_criteria)
    ? inclusion_criteria
    : (inclusion_criteria || '').split('\n').map(s => s.trim()).filter(Boolean);
  const excList = Array.isArray(exclusion_criteria)
    ? exclusion_criteria
    : (exclusion_criteria || '').split('\n').map(s => s.trim()).filter(Boolean);

  const parsed = parseScreeningResponse(result.content, incList, excList);

  return {
    decision: parsed.decision,
    rationale: parsed.rationale,
    reasoning: parsed.rationale,
    inclusion_evaluation: parsed.inclusion_evaluation,
    exclusion_evaluation: parsed.exclusion_evaluation,
    model: result.model,
    provider: result.provider,
    usage: result.usage,
    prompt,
    rawResponse: result.content
  };
}

module.exports = {
  getProvider,
  getAvailableProviders,
  getAvailableModels,
  buildScreeningPrompt,
  screenArticle,
  providers
};
