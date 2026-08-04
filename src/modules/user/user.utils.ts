import { IUser } from './user.model';

export function sanitize(user: IUser): Record<string, unknown> {
  const obj = user.toObject();
  delete (obj as { password?: string }).password;
  return obj;
}
