import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

// FIX: Per coding guidelines, API key must be obtained from `process.env.API_KEY`.
// The UI will check this flag to prevent API calls with a missing key.
export const isApiKeySet = !!process.env.API_KEY;

// FIX: Per coding guidelines, initialize with `process.env.API_KEY`.
// The empty string fallback is for type safety, as the constructor expects a string.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });


// Helper function to convert File object to a base64 string
const fileToInlineData = async (file: File): Promise<{mimeType: string, data: string}> => {
  const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // The result includes the 'data:image/jpeg;base64,' prefix, which we need to remove.
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error("Failed to read file."));
      }
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
  return {
    mimeType: file.type,
    data: await base64EncodedDataPromise,
  };
};

export const generateFashionImage = async (
  imageFile: File,
  scenePrompt: string
): Promise<string> => {
  if (!isApiKeySet) {
    // FIX: Updated error message to reflect the correct environment variable.
    throw new Error('API Key not configured. Please set the API_KEY environment variable.');
  }

  const model = 'gemini-2.5-flash-image-preview';

  const imagePart = {
    inlineData: await fileToInlineData(imageFile)
  };

  // Revised prompt to be less restrictive and align with model capabilities.
  const combinedPrompt = `Generate a new fashion editorial image based on the scene description: "${scenePrompt}". Use the provided image of a person as a strong visual reference for their appearance and clothing. Recreate the style of the outfit, the person's hair, and general physical characteristics in the new scene. The person's pose and the background environment should be newly generated based on the scene description. The result should be a cohesive, high-quality photograph.`;

  const textPart = {
    text: combinedPrompt,
  };
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [imagePart, textPart],
      },
      config: {
        // Nano Banana requires both IMAGE and TEXT modalities
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    // Find the image part in the response
    // FIX: Removed unnecessary optional chaining as response structure is guaranteed on success.
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && typeof part.inlineData.data === 'string' && typeof part.inlineData.mimeType === 'string') {
        const base64ImageBytes = part.inlineData.data;
        const mimeType = part.inlineData.mimeType;
        return `data:${mimeType};base64,${base64ImageBytes}`;
      }
    }

    // Check for a text-only response if no image is found
    // FIX: Access response.text directly as per guidelines.
    const textResponse = response.text.trim();
    if (textResponse) {
      throw new Error(`The model returned a text response instead of an image: "${textResponse}"`);
    }

    throw new Error('No image was generated. The model response did not contain image data.');

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error && error.message.includes('API key not valid')) {
       throw new Error('Invalid API Key. Please check your environment configuration.');
    }
    throw new Error('Failed to generate image due to an API error.');
  }
};

export const enhanceImage = async (base64ImageDataUri: string): Promise<string> => {
  if (!isApiKeySet) {
    // FIX: Updated error message to reflect the correct environment variable.
    throw new Error('API Key not configured. Please set the API_KEY environment variable.');
  }
  
  const model = 'gemini-2.5-flash-image-preview';

  const [header, data] = base64ImageDataUri.split(',');
  if (!header || !data) {
    throw new Error("Invalid base64 image data URI for enhancement.");
  }
  const mimeType = header.match(/:(.*?);/)?.[1];
  if (!mimeType) {
    throw new Error("Could not extract mime type from data URI for enhancement.");
  }
  
  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: data,
    }
  };

  // Revised prompt to focus on quality improvement without triggering identity policies.
  const textPart = {
    text: "Enhance this image by upscaling it to a higher resolution and improving its photorealism. Focus on refining details like textures, skin tones, lighting, and shadows to achieve a professional, high-quality photographic look. It is critical to preserve all original elements of the image—do not change the person's appearance, clothing, pose, or the background. The objective is strictly to improve visual quality and fidelity without altering the content.",
  };

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [imagePart, textPart],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });
    
    // FIX: Removed unnecessary optional chaining.
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && typeof part.inlineData.data === 'string' && typeof part.inlineData.mimeType === 'string') {
        const base64ImageBytes = part.inlineData.data;
        const responseMimeType = part.inlineData.mimeType;
        return `data:${responseMimeType};base64,${base64ImageBytes}`;
      }
    }
    
    // FIX: Access response.text directly as per guidelines.
    const textResponse = response.text.trim();
    if (textResponse) {
      throw new Error(`The enhancement model returned text instead of an image: "${textResponse}"`);
    }

    throw new Error('Enhancement failed. The model response did not contain image data.');

  } catch (error) {
    console.error("Error calling Gemini API for enhancement:", error);
    if (error instanceof Error && error.message.includes('API key not valid')) {
       throw new Error('Invalid API Key. Please check your environment configuration.');
    }
    throw new Error('Failed to enhance image due to an API error.');
  }
};
