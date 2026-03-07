import type { Branch } from 'src/types/domain';
import { http } from './http';

export async function getBranches(): Promise<Branch[]> {
  const res = await http.get<Branch[]>('/v1/branches');
  return res.data;
}

export async function getBranch(id: string): Promise<Branch> {
  const res = await http.get<Branch>(`/v1/branches/${encodeURIComponent(id)}`);
  return res.data;
}
