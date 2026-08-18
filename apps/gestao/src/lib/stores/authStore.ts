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

const defaultAdminUser: AuthUser = {
  id: 'usr-admin',
  name: 'Mateus Vieira (Administrador)',
  email: 'admin@imperiusdopastel.com.br',
  role: 'ADMIN',
  roleLabel: 'Administrador / Gerente',
  avatar: 'MV'
};

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthUser | null>(defaultAdminUser);

  return {
    subscribe,

    loginAs: (role: UserRole, name?: string) => {
      let roleLabel = 'Administrador / Gerente';
      let avatar = 'MS';

      if (role === 'COZINHA') {
        roleLabel = 'Equipe de Cozinha / Chef';
        avatar = 'CZ';
      } else if (role === 'CAIXA') {
        roleLabel = 'Operador de Caixa';
        avatar = 'CX';
      } else if (role === 'ATENDENTE') {
        roleLabel = 'Atendente de Salão';
        avatar = 'AT';
      }

      const user: AuthUser = {
        id: `usr-${role.toLowerCase()}`,
        name: name || (role === 'COZINHA' ? 'João Cozinheiro' : role === 'CAIXA' ? 'Carlos Caixa' : 'Matheus Silva'),
        email: `${role.toLowerCase()}@espankaburguer.com.br`,
        role,
        roleLabel,
        avatar
      };

      set(user);
      return user;
    },

    logout: () => {
      set(null);
    }
  };
}

export const authStore = createAuthStore();
