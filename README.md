# Meme Generator MCP Server

An MCP (Model Context Protocol) server that generates funny memes from Indian news articles using AI.

## Features

- **Fetch Indian News**: Get latest news articles from Indian sources
- **AI-Powered Captions**: Generate funny meme captions using Google Gemini
- **Meme Creation**: Create actual meme images using Imgflip templates
- **Complete Workflow**: End-to-end meme generation from news to image

## Setup

### 1. Install Dependencies
```

npm install

```

### 2. Environment Variables
Copy `.env.example` to `.env` and fill in your API credentials:

```

cp .env.example .env

```

**Required API Keys:**
- **NewsData.io**: Get free API key at [newsdata.io](https://newsdata.io)
- **Google Gemini**: Get API key from [Google AI Studio](https://makersuite.google.com)
- **Imgflip**: Create account at [imgflip.com](https://imgflip.com) for username/password

### 3. Build and Run
```

npm run build
npm start

```

## Available Tools

### 1. `fetch_indian_news`
**Description**: Fetch latest Indian news articles by topic
**Parameters**: 
- `topic` (optional): News topic to search for

### 2. `get_meme_templates`  
**Description**: Get available meme templates from Imgflip
**Parameters**: None

### 3. `generate_meme_caption`
**Description**: Generate AI-powered meme caption for news
**Parameters**:
- `title`: News article title
- `description`: News article description  
- `availableTemplates`: Array of template IDs

### 4. `create_meme`
**Description**: Create meme image using template and text
**Parameters**:
- `templateId`: Imgflip template ID
- `topText`: Top text for meme
- `bottomText`: Bottom text for meme

### 5. `generate_news_meme`
**Description**: Complete workflow - fetch news and create meme
**Parameters**:
- `topic` (optional): News topic
- `articleIndex` (optional): Which article to use (default: 0)

## Usage with MCP Client

Add to your MCP client configuration:

```

{
"mcpServers": {
"meme-generator": {
"command": "node",
"args": ["/path/to/meme-generator-mcp-server/dist/index.js"],
"env": {
"NEWSDATA_API_KEY": "your_key",
"GEMINI_API_KEY": "your_key",
"IMGFLIP_USERNAME": "your_username",
"IMGFLIP_PASSWORD": "your_password"
}
}
}
}

```

## Example Usage

1. **Generate meme from trending news:**
```

Use generate_news_meme with topic "politics"

```

2. **Step-by-step workflow:**
```

1. fetch_indian_news with topic "cricket"
2. get_meme_templates
3. generate_meme_caption with article details
4. create_meme with generated caption
```

## Error Handling

- Validates all required environment variables on startup
- Provides detailed error messages for API failures
- Handles malformed responses gracefully
- Includes retry logic for network issues


## Key Features of This MCP Server

### **🛠 Tool Descriptions**

1. **`fetch_indian_news`**: Retrieves current Indian news articles with optional topic filtering
2. **`get_meme_templates`**: Fetches popular meme templates from Imgflip
3. **`generate_meme_caption`**: Uses Gemini AI to create contextual, funny captions
4. **`create_meme`**: Generates actual meme images using Imgflip API
5. **`generate_news_meme`**: Complete end-to-end workflow tool


This MCP server transforms your original standalone script into a reusable service that can be integrated with various AI assistants and applications supporting the MCP protocol.

