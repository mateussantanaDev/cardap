import { writable } from 'svelte/store';

export type UserRole = 'ADMIN' | 'CAIXA' | 'COZINHA' | 'ATENDENTE';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  avatar: string;
}

function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return 'Administrador / Gerente';
    case 'COZINHA':
      return 'Chef de Cozinha / KDS';
    case 'CAIXA':
      return 'Operador de Caixa';
    case 'ATENDENTE':
      return 'Atendente de Salão';
    default:
      return 'Usuário';
  }
}

function getAvatar(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthUser | null>(null);

  return {
    subscribe,

    setUser: (rawUser: { id: string; name: string; email: string; role: string } | null) => {
      if (!rawUser) {
        set(null);
        return;
      }

      const role = (rawUser.role || 'ADMIN') as UserRole;
      const user: AuthUser = {
        id: rawUser.id,
        name: rawUser.name,
        email: rawUser.email,
        role,
        roleLabel: getRoleLabel(role),
        avatar: getAvatar(rawUser.name)
      };

      set(user);
    },

    clear: () => {
      set(null);
    },

    logout: () => {
      set(null);
    }
  };
}

export const authStore = createAuthStore();
