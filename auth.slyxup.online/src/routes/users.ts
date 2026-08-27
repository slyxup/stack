import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { sanitizeUser } from '../lib/sanitize';
import { requireSession } from '../middleware/auth';
import { changePasswordSchema, updateUserSchema } from '../schemas/users';
import {
  changePassword,
  deleteUser,
  updateUser,
} from '../services/user.service';

const users = new Hono<{
  Bindings: { DB: D1Database };
  Variables: { userId: string };
}>();

users.use('*', requireSession);

users.patch('/', zValidator('json', updateUserSchema), async (c) => {
  const input = c.req.valid('json');
  const updated = await updateUser(c.env, c.get('userId'), input);
  return c.json({ ok: true, user: updated ? sanitizeUser(updated) : null });
});

// Change password (email/password accounts only)
users.post('/password', zValidator('json', changePasswordSchema), async (c) => {
  const { currentPassword, newPassword } = c.req.valid('json');
  try {
    await changePassword(c.env, c.get('userId'), currentPassword, newPassword);
    return c.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return c.json({ ok: false, error: msg }, 400);
  }
});

users.delete('/', async (c) => {
  await deleteUser(c.env, c.get('userId'));
  return c.json({ ok: true });
});

export default users;
