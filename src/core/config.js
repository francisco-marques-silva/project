require('dotenv').config();

// Vercel Supabase integration uses POSTGRES_URL, POSTGRES_PRISMA_URL, etc.
// Fallback chain: DATABASE_URL -> POSTGRES_URL -> POSTGRES_PRISMA_URL -> POSTGRES_URL_NON_POOLING
const databaseUrl = process.env.DATABASE_URL 
  || process.env.POSTGRES_URL 
  || process.env.POSTGRES_PRISMA_URL 
  || process.env.POSTGRES_URL_NON_POOLING;

const config = {
  port: parseInt(process.env.PORT) || 8000,
  
  database: {
    url: databaseUrl,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: databaseUrl && !databaseUrl.includes('localhost')
        ? { require: true, rejectUnauthorized: false }
        : false
    }
  },

  jwt: {
    secret: process.env.JWT_SECRET_KEY || 'default-secret-change-me',
    expiresIn: '7d'
  },

  llm: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      defaultModel: 'gpt-4o'
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      defaultModel: 'claude-sonnet-4-5-20250929'
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      defaultModel: 'gemini-3-flash-preview'
    }
  },

  databases: {
    pubmed: {
      apiKey: process.env.PUBMED_API_KEY || '',
      baseUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
    },
    scopus: {
      apiKey: process.env.SCOPUS_API_KEY || '',
      baseUrl: 'https://api.elsevier.com/content/search/scopus'
    },
    wos: {
      apiKey: process.env.WOS_API_KEY || '',
      baseUrl: 'https://api.clarivate.com/apis/wos-starter/v1'
    },
    embase: {
      apiKey: process.env.EMBASE_API_KEY || '',
      instToken: process.env.EMBASE_INST_TOKEN || '',
      baseUrl: 'https://api.elsevier.com/content/search/scopus'
    }
  }
};

module.exports = config;
