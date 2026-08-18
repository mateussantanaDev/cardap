import { UserRole } from '@cardap/core';

declare global {
  namespace App {
    interface Locals {
      user: {
        id: string;
        name: string;
        email: string;
        role: UserRole;
      } | null;
    }
  }
}

export {};
