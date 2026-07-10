export interface Scene {
  sceneNumber: number;
  visualPrompt: string;
  summary: string;
  imageUrl?: string;
  isLoading?: boolean;
  error?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}
