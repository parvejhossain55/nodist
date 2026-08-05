import { sanitize } from '@modules/user/user.utils';
import type { IUser } from '@modules/user/user.model';

describe('sanitize', () => {
  it('strips the password hash from the user object', () => {
    const user = {
      toObject: () => ({
        _id: 'u1',
        name: 'Test User',
        email: 'test@example.com',
        password: 'super-secret-hash',
        role: 'user',
        isActive: true,
        isEmailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    } as unknown as IUser;

    const result = sanitize(user);

    expect(result).toMatchObject({ name: 'Test User', email: 'test@example.com' });
    expect(result.password).toBeUndefined();
    expect(Object.keys(result)).not.toContain('password');
  });
});
