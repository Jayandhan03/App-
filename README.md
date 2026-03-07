Here is a simple breakdown of the tech stack you are using for your AI News application:

1. Front-End (What the user sees and interacts with)
The front-end is located in the ai-news folder and is built to be fast and modern.

Next.js (v16) & React (v19): This is the core framework used to build the user interface (like the hero section, inputs, and buttons on 

page.tsx
). It manages the state (like showing a "Summarizing..." loading state) and handles the overall layout.
TypeScript: The programming language used. It's a stricter, more reliable version of JavaScript that helps catch errors while you type the code.
Tailwind CSS (v4): Used for styling. Instead of writing separate CSS files, you use utility classes right inside the code (like text-center, max-w-6xl, bg-white) to make the app look beautiful.
Next.js API Routes: The files in app/api/... act as a secure "middleman." When the user clicks generate, the front-end sends a request to these Next.js API routes, which then secretly talk to your Python backend so that your main backend URL isn't exposed directly in the browser.
2. Back-End (The brain and heavy lifting behind the scenes)
Your back-end is located in the IndustryEar folder (main.py) and handles all the complex AI tasks.

FastAPI (Python): A very fast Python web framework. It listens for requests from your Next.js middleman and coordinates the entire news-generation pipeline.
News Fetcher (fetch_news): A custom function (likely using an external API) that searches the web for the latest articles on the user's chosen topic.
LangChain & xAI Grok LLM ("The Writer"): Once the news articles are fetched, they are passed to an AI model (xAI Grok) using Langchain. The AI acts as a professional news anchor, reading the raw articles and writing a polished, broadcast-style news script.
ElevenLabs ("The Voice"): This is a powerful Text-To-Speech (TTS) service. It takes the summarized script written by the AI and converts it into a high-quality audio file (an MP3) using a realistic news anchor voice, which is then sent back to the user to play or download.
In summary workflow: User types topic ➔ Next.js Front-End ➔ Next.js Middleman API ➔ Python FastAPI ➔ Fetches articles ➔ xAI Grok writes the script ➔ ElevenLabs speaks the script ➔ Audio streams all the way back to the user's screen.



This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
