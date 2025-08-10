import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

// Interfaces (keep all your existing interfaces)
interface NewsArticle {
  title: string;
  description: string;
  link?: string;
  pubDate?: string;
}

interface ImgflipTemplate {
  id: number;
  name: string;
}

interface MemeCaption {
  image: number;
  topText: string;
  bottomText: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

interface ImgflipResponse {
  success: boolean;
  data?: {
    url: string;
  };
  error_message?: string;
}

class MemeGeneratorHttpServer {
  private app: express.Application;
  private server: Server;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    
    // Initialize MCP Server for internal use
    this.server = new Server(
      {
        name: "meme-generator-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
  }

  private setupMiddleware(): void {
    // Enable CORS for all routes
    this.app.use(cors());
    
    // Parse JSON bodies
    this.app.use(express.json({ limit: '10mb' }));
    
    // Parse URL-encoded bodies
    this.app.use(express.urlencoded({ extended: true }));
    
    // Basic logging middleware
    this.app.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // List available tools
    this.app.get('/tools', async (req: Request, res: Response) => {
      try {
        const tools = this.getAvailableTools();
        res.json({ success: true, tools });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // Execute tool endpoints
    this.app.post('/tools/fetch-news', async (req: Request, res: Response) => {
      await this.handleToolRequest(req, res, 'fetch_indian_news');
    });

    this.app.post('/tools/get-templates', async (req: Request, res: Response) => {
      await this.handleToolRequest(req, res, 'get_meme_templates');
    });

    this.app.post('/tools/generate-caption', async (req: Request, res: Response) => {
      await this.handleToolRequest(req, res, 'generate_meme_caption');
    });

    this.app.post('/tools/create-meme', async (req: Request, res: Response) => {
      await this.handleToolRequest(req, res, 'create_meme');
    });

    this.app.post('/tools/generate-news-meme', async (req: Request, res: Response) => {
      await this.handleToolRequest(req, res, 'generate_news_meme');
    });

    // Catch-all route
    this.app.get('*', (req: Request, res: Response) => {
      res.status(404).json({ 
        success: false, 
        error: 'Endpoint not found',
        availableEndpoints: [
          'GET /health',
          'GET /tools',
          'POST /tools/fetch-news',
          'POST /tools/get-templates',
          'POST /tools/generate-caption',
          'POST /tools/create-meme',
          'POST /tools/generate-news-meme'
        ]
      });
    });
  }

  private async handleToolRequest(req: Request, res: Response, toolName: string): Promise<void> {
    try {
      this.validateEnvVars();
      
      const args = req.body;
      let result;

      switch (toolName) {
        case 'fetch_indian_news':
          result = await this.handleFetchNews(args);
          break;
        case 'get_meme_templates':
          result = await this.handleGetTemplates(args);
          break;
        case 'generate_meme_caption':
          result = await this.handleGenerateCaption(args);
          break;
        case 'create_meme':
          result = await this.handleCreateMeme(args);
          break;
        case 'generate_news_meme':
          result = await this.handleGenerateNewsMeme(args);
          break;
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      res.json(result);
    } catch (error) {
      console.error(`Error in ${toolName}:`, error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((err: any, req: Request, res: Response, next: any) => {
      console.error('Global error handler:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      process.exit(0);
    });
  }

  private getAvailableTools(): Tool[] {
    return [
      {
        name: "fetch_indian_news",
        description: "Fetch latest Indian news articles by topic. Returns up to 10 recent articles from Indian news sources in English.",
        inputSchema: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description: "News topic to search for (optional). If empty, returns general Indian news.",
            },
          },
        },
      },
      {
        name: "get_meme_templates",
        description: "Fetch available meme templates from Imgflip. Returns top 100 popular meme templates with their IDs and names.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "generate_meme_caption",
        description: "Generate funny meme caption for a news article using Gemini AI. Returns JSON with template ID and top/bottom text.",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "News article title",
            },
            description: {
              type: "string",
              description: "News article description",
            },
            availableTemplates: {
              type: "array",
              items: {
                type: "number",
              },
              description: "Array of available template IDs to choose from",
            },
          },
          required: ["title", "description", "availableTemplates"],
        },
      },
      {
        name: "create_meme",
        description: "Create a meme image using Imgflip API with specified template and text. Returns the URL of the generated meme.",
        inputSchema: {
          type: "object",
          properties: {
            templateId: {
              type: "number",
              description: "Imgflip template ID",
            },
            topText: {
              type: "string",
              description: "Text for the top of the meme",
            },
            bottomText: {
              type: "string",
              description: "Text for the bottom of the meme",
            },
          },
          required: ["templateId", "topText", "bottomText"],
        },
      },
      {
        name: "generate_news_meme",
        description: "Complete workflow: fetch news, generate caption, and create meme. This is a convenience tool that combines all steps.",
        inputSchema: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description: "News topic to search for (optional)",
            },
            articleIndex: {
              type: "number",
              description: "Index of article to use from search results (default: 0)",
              default: 0,
            },
          },
        },
      },
    ];
  }

  // Keep all your existing private methods unchanged
  private validateEnvVars(): void {
    const required = [
      "NEWSDATA_API_KEY",
      "GEMINI_API_KEY",
      "IMGFLIP_USERNAME",
      "IMGFLIP_PASSWORD",
    ];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`
      );
    }
  }

  private async handleFetchNews(args: any) {
    const topic = args?.topic || "";
    const news = await this.getIndianNewsByTopic(topic);
    return {
      success: true,
      count: news.length,
      articles: news,
    };
  }

  private async handleGetTemplates(args: any) {
    const templates = await this.fetchImgflipTemplates();
    return {
      success: true,
      count: templates.length,
      templates: templates,
    };
  }

  private async handleGenerateCaption(args: any) {
    const { title, description, availableTemplates } = args;
    if (!title || !description || !availableTemplates) {
      throw new Error(
        "Missing required parameters: title, description, availableTemplates"
      );
    }

    const caption = await this.generateCaption(
      title,
      description,
      availableTemplates
    );
    return {
      success: true,
      caption: caption,
    };
  }

  private async handleCreateMeme(args: any) {
    const { templateId, topText, bottomText } = args;
    if (!templateId || !topText || !bottomText) {
      throw new Error(
        "Missing required parameters: templateId, topText, bottomText"
      );
    }

    const memeUrl = await this.generateMeme(templateId, topText, bottomText);
    return {
      success: true,
      memeUrl: memeUrl,
    };
  }

  private async handleGenerateNewsMeme(args: any) {
    const topic = args?.topic || "";
    const articleIndex = args?.articleIndex || 0;

    try {
      // Step 1: Fetch news
      const news = await this.getIndianNewsByTopic(topic);
      if (news.length === 0) {
        throw new Error("No news articles found");
      }

      const article = news[articleIndex];
      if (!article || !article.title || !article.description) {
        throw new Error("Selected article missing title or description");
      }

      // Step 2: Get templates
      const templates = await this.fetchImgflipTemplates();
      const templateIds = templates.map((t) => t.id);

      // Step 3: Generate caption
      const caption = await this.generateCaption(
        article.title,
        article.description,
        templateIds
      );
      if (!caption) {
        throw new Error("Failed to generate meme caption");
      }

      // Step 4: Create meme
      const memeUrl = await this.generateMeme(
        caption.image,
        caption.topText,
        caption.bottomText
      );

      return {
        success: true,
        article: {
          title: article.title,
          description: article.description,
        },
        caption: caption,
        memeUrl: memeUrl,
      };
    } catch (error) {
      throw new Error(
        `Failed to generate news meme: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Keep all your existing API methods unchanged
  private async getIndianNewsByTopic(topic: string = ""): Promise<NewsArticle[]> {
    const baseUrl = "https://newsdata.io/api/1/latest";
    const apiKey = process.env.NEWSDATA_API_KEY!;
    const params = new URLSearchParams({
      apikey: apiKey,
      country: "in",
      language: "en",
      size: "10",
    });

    if (topic.trim()) {
      params.append("q", topic);
    }

    try {
      const response = await fetch(`${baseUrl}?${params}`);
      if (!response.ok) {
        throw new Error(
          `NewsData API error: ${response.status} ${response.statusText}`
        );
      }

      const data: any = await response.json();
      if (!data.results || !Array.isArray(data.results)) {
        console.warn("NewsData API returned unexpected format");
        return [];
      }

      return data.results;
    } catch (error) {
      console.error("Error fetching Indian news:", error);
      throw new Error(
        `Failed to fetch news: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async generateCaption(
    title: string,
    description: string,
    availableTemplates: number[]
  ): Promise<MemeCaption | null> {
    const prompt = `Generate a meme worthy caption for the following news: ${title}, ${description}

Response should be valid JSON in this exact format:
{
  "image": <template_id>,
  "topText": "<top_text>",
  "bottomText": "<bottom_text>"
}

The image number should be a template ID from imgflip that's relevant to this meme.
Choose from these template IDs only: ${availableTemplates.join(", ")}
Make the meme funny and relevant to the news content.`;

    const geminiApiKey = process.env.GEMINI_API_KEY!;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

    const body = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
      }

      const data: any = await res.json();
      const output = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!output) {
        console.warn("Gemini API returned empty response");
        return null;
      }

      return this.parseMemeCaption(output);
    } catch (err) {
      console.error("Error calling Gemini API:", err);
      throw new Error(
        `Failed to generate caption: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  }

  private async generateMeme(
    templateId: number,
    topText: string,
    bottomText: string
  ): Promise<string> {
    const username = process.env.IMGFLIP_USERNAME!;
    const password = process.env.IMGFLIP_PASSWORD!;

    const params = new URLSearchParams({
      template_id: templateId.toString(),
      username,
      password,
      text0: topText,
      text1: bottomText,
    });

    try {
      const res = await fetch(`https://api.imgflip.com/caption_image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });

      if (!res.ok) {
        throw new Error(`Imgflip API error: ${res.status} ${res.statusText}`);
      }

      const data: any = await res.json();
      if (!data.success) {
        throw new Error(`Imgflip API error: ${data.error_message}`);
      }

      return data.data?.url || null;
    } catch (err) {
      console.error("Error generating meme:", err);
      throw new Error(
        `Failed to generate meme: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  }

  private async fetchImgflipTemplates(): Promise<ImgflipTemplate[]> {
    try {
      const res = await fetch("https://api.imgflip.com/get_memes");
      if (!res.ok) {
        throw new Error(
          `Imgflip templates API error: ${res.status} ${res.statusText}`
        );
      }

      const json: any = await res.json();
      if (!json.success) {
        throw new Error("Imgflip API returned success: false");
      }

      const memes = json.data.memes.slice(0, 100); // Limit to top 100
      return memes.map(({ id, name }: { id: number; name: string }) => ({
        id,
        name,
      }));
    } catch (err) {
      console.error("Error fetching Imgflip templates:", err);
      throw new Error(
        `Failed to fetch templates: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  }

  private parseMemeCaption(caption: string): MemeCaption | null {
    try {
      const cleaned = caption
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

      const json = JSON.parse(cleaned);

      if (!json.image || !json.topText || !json.bottomText) {
        console.error("Invalid meme caption format - missing required fields");
        return null;
      }

      const imageId = Number(json.image);
      if (isNaN(imageId)) {
        console.error("Invalid image template ID");
        return null;
      }

      return {
        image: imageId,
        topText: String(json.topText),
        bottomText: String(json.bottomText),
      };
    } catch (error) {
      console.error("Error parsing meme caption JSON:", error);
      return null;
    }
  }

  async start(): Promise<void> {
    const port = 8080;
    
    this.app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Meme Generator HTTP Server running on port ${port}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
      console.log(`🛠️  Available tools: http://localhost:${port}/tools`);
      console.log('🔧 Environment variables required:');
      console.log('   - NEWSDATA_API_KEY');
      console.log('   - GEMINI_API_KEY');
      console.log('   - IMGFLIP_USERNAME');
      console.log('   - IMGFLIP_PASSWORD');
    });
  }
}

// Start the server
const server = new MemeGeneratorHttpServer();
server.start().catch(console.error);
