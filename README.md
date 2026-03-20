# callapi

Local webpage for translation and summarization using SiliconFlow.

Default usage: English input, Chinese output.

## Features

- Paste text into a webpage running on your local PC
- `Translate`
- `Summarize`
- `Translate and Summarize`
- Calls SiliconFlow with the model `Pro/deepseek-ai/DeepSeek-V3.2`
- Keeps the API key on the server side

## Setup

1. Copy `.env.example` to `.env`
2. Put your SiliconFlow API key into `.env`
3. Start the app:

```bash
npm start
```

4. Open `http://localhost:3000`

## Environment Variables

```env
SILICONFLOW_API_KEY=your_siliconflow_api_key
PORT=3000
```

## Notes

- This app uses Node's built-in HTTP server and `fetch`, so no extra dependencies are required.
- The current local `.env` file is not committed to Git.
