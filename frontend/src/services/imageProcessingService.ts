interface ImageProcessingRequest {
  image: File;
  message: string;
  systemPrompt: string;
  conversationId: string;
  modelId: string;
}

interface ImageProcessingResponse {
  reply: string;
  conversationId: string;
  messageCount: number;
  usage?: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
  timestamp: string;
}

export class ImageProcessingService {
  private static readonly API_BASE_URL = 'http://localhost:3001/api';

  /**
   * Process image with AI using the chat-with-image endpoint
   */
  static async processImageWithAI(request: ImageProcessingRequest): Promise<ImageProcessingResponse> {
    try {
      console.log('🔄 Processing image with AI...', {
        imageName: request.image.name,
        imageSize: request.image.size,
        message: request.message.substring(0, 50) + '...',
        conversationId: request.conversationId
      });

      // Create form data for image upload
      const formData = new FormData();
      formData.append('image', request.image);
      formData.append('message', request.message);
      formData.append('systemPrompt', request.systemPrompt);
      formData.append('conversationId', request.conversationId);
      formData.append('modelId', request.modelId);

      const token = localStorage.getItem('token');
      const response = await fetch(`${this.API_BASE_URL}/chat-with-image`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
        credentials: 'include',
        body: formData,
      });

      console.log('📡 Image processing response status:', response.status);

      if (!response.ok) {
        let errorPayload: any = null;
        let errorText = '';
        try {
          errorPayload = await response.json();
          errorText = JSON.stringify(errorPayload);
        } catch {
          errorText = await response.text();
        }
        if (response.status === 401 && errorPayload?.code === 'GUEST_LOGIN_REQUIRED') {
          window.dispatchEvent(new CustomEvent('auth-required', { detail: { limit: errorPayload?.limit || 5 } }));
        }
        console.error('❌ Image processing API Error:', response.status, errorText);
        throw new Error(`Image processing failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Image processing successful:', data);

      return data;
    } catch (error) {
      console.error('💥 Image processing error:', error);
      throw error;
    }
  }

  /**
   * Fallback method using regular chat API with image context
   */
  static async processImageWithFallback(request: ImageProcessingRequest): Promise<ImageProcessingResponse> {
    try {
      console.log('🔄 Processing image with fallback method...');

      // Convert image to base64 for context (not used in fallback but kept for future use)
      await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(request.image);
      });

      // Create a message that includes the image description
      const imagePrompt = request.message || 'What do you see in this image?';
      const fullPrompt = `${imagePrompt}\n\n[Image attached: ${request.image.name}]\n\nPlease analyze this image and provide a detailed description of what you see.`;

      const token = localStorage.getItem('token');
      const response = await fetch(`${this.API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          message: fullPrompt,
          systemPrompt: request.systemPrompt,
          userPrompt: fullPrompt,
          conversationId: request.conversationId,
          modelId: request.modelId
        }),
      });

      console.log('📡 Fallback response status:', response.status);

      if (!response.ok) {
        let errorPayload: any = null;
        let errorText = '';
        try {
          errorPayload = await response.json();
          errorText = JSON.stringify(errorPayload);
        } catch {
          errorText = await response.text();
        }
        if (response.status === 401 && errorPayload?.code === 'GUEST_LOGIN_REQUIRED') {
          window.dispatchEvent(new CustomEvent('auth-required', { detail: { limit: errorPayload?.limit || 5 } }));
        }
        console.error('❌ Fallback API Error:', response.status, errorText);
        throw new Error(`Fallback processing failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Fallback processing successful:', data);

      return data;
    } catch (error) {
      console.error('💥 Fallback processing error:', error);
      throw error;
    }
  }

  /**
   * Process image with AI, trying the dedicated endpoint first, then falling back
   */
  static async processImage(request: ImageProcessingRequest): Promise<ImageProcessingResponse> {
    try {
      // Try the dedicated image processing endpoint first
      return await this.processImageWithAI(request);
    } catch (error) {
      console.log('🔄 Image endpoint failed, trying fallback method...');
      // Fall back to regular chat API
      return await this.processImageWithFallback(request);
    }
  }

  /**
   * Validate image file
   */
  static validateImage(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'Please select a valid image file' };
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, error: 'Image size must be less than 10MB' };
    }

    return { valid: true };
  }
}
