export interface AuthResult {
  token: string;
  userId: string;
  userName: string;
  clientRef: string;
  permissions: string[];
}

class AuthService {
  async login(username: string, password: string): Promise<AuthResult> {
    const authBase = import.meta.env.VITE_AUTH_BASE ?? '/login';
    const response = await fetch(`${authBase}/login/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error('Invalid credentials');
    }

    const data = await response.json();

    return {
      token: data.rememberMeToken,
      userId: String(data.id ?? data.user_id ?? ''),
      userName: data.user_name ?? data.name ?? username,
      clientRef: String(data.client_ref ?? data.fk_customer_account ?? ''),
      permissions: data.permissions ?? [],
    };
  }
}

export const authService = new AuthService();
