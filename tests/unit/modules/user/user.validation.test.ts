import { updateUserSchema, getUserSchema, listUsersSchema } from '@modules/user/user.validation';

describe('user validation schemas', () => {
  describe('updateUserSchema', () => {
    it('accepts a valid payload', () => {
      expect(() =>
        updateUserSchema.parse({ body: { name: 'New Name' }, params: { id: 'u1' } }),
      ).not.toThrow();
    });

    it('rejects a name that is too short', () => {
      expect(() => updateUserSchema.parse({ body: { name: 'A' }, params: { id: 'u1' } })).toThrow();
    });

    it('rejects a missing params.id', () => {
      expect(() => updateUserSchema.parse({ body: { name: 'New Name' } })).toThrow();
    });
  });

  describe('getUserSchema', () => {
    it('requires params.id', () => {
      expect(() => getUserSchema.parse({ params: { id: 'u1' } })).not.toThrow();
      expect(() => getUserSchema.parse({})).toThrow();
    });
  });

  describe('listUsersSchema', () => {
    it('applies defaults for page and limit', () => {
      const parsed = listUsersSchema.parse({ query: {} });
      expect(parsed.query.page).toBe(1);
      expect(parsed.query.limit).toBe(20);
    });

    it('coerces string query values to numbers', () => {
      const parsed = listUsersSchema.parse({ query: { page: '3', limit: '50' } });
      expect(parsed.query.page).toBe(3);
      expect(parsed.query.limit).toBe(50);
    });

    it('rejects a limit above 100', () => {
      expect(() => listUsersSchema.parse({ query: { limit: 500 } })).toThrow();
    });
  });
});
