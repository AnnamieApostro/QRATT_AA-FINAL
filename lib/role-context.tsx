
import { createContext, useContext } from 'react';
import type { Role } from './profiles';

export const RoleContext = createContext<Role | null>(null);

export function useAppRole(): Role | null {
  return useContext(RoleContext);
}
