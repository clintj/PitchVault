export interface Pitch {
  id: string;
  title: string;
  description: string | null;
  html_content: string | null;
  content?: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string | null;
  updatedAt?: string;
  is_archived: boolean;
  isActive?: boolean;
  settings?: {
    isGated?: boolean;
    password?: string;
  };
  stats?: {
    views: number;
  };
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_verified: boolean;
  created_at: string;
}

export interface LoginData {
  email: string;
  password?: string;
}
