# AI Fashion Photoshoot Studio

This is a React-based web application that uses the Google Gemini API to generate new editorial-style fashion images. You can upload a photo of a model, describe a new scene, and the AI will generate a new image maintaining the model's appearance and clothing in the described setting.

## Features

-   **Image Upload**: Upload a source image of a model.
-   **AI Image Generation**: Describe a new scene with a text prompt to generate a new image.
-   **Image Enhancement**: Upscale and improve the photorealism of the generated image.
-   **Advanced Export**: Download the final image with custom settings for format, quality, resolution, and color grading.

## How to Deploy for Free with Vercel

This is a static React application and is best deployed on a platform like Vercel. Here’s how to do it in a few simple steps.

### Prerequisites

-   A [GitHub](https://github.com/) account.
-   A [Vercel](https://vercel.com/signup) account (you can sign up with your GitHub account).
-   Your Google Gemini API Key. You can get one from [Google AI Studio](https://aistudio.google.com/app/apikey).

### Deployment Steps

1.  **Fork this Repository**: Start by forking this repository to your own GitHub account.

2.  **Create a New Vercel Project**:
    -   Go to your [Vercel Dashboard](https://vercel.com/dashboard).
    -   Click the **"Add New..."** button and select **"Project"**.

3.  **Import Your GitHub Repository**:
    -   In the "Import Git Repository" section, find the repository you just forked and click **"Import"**.
    -   Vercel will automatically detect that this is a Vite project. The default settings should be correct, so you don't need to change any build commands or directories.

4.  **Add Your API Key**:
    -   Before deploying, you need to add your Google Gemini API Key as an environment variable.
    -   Expand the **"Environment Variables"** section.
    -   Add a new variable:
        -   **Name**: `API_KEY`
        -   **Value**: Paste your Google Gemini API key here.
    -   Make sure the variable is available for all environments.

5.  **Deploy**:
    -   Click the **"Deploy"** button.
    -   Vercel will now build and deploy your application. This usually takes a minute or two.

Once the deployment is complete, Vercel will provide you with a live URL. Congratulations, your AI Fashion Studio is now online!