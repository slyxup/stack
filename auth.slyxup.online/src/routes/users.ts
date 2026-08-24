import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireSession } from '../middleware/auth';
import { updateUserSchema } from '../schemas/users';
import { deleteUser, updateUser } from '../services/user.service';

const users = new Hono<{
  Bindings: { DB: D1Database };
  Variables: { userId: string };
}>();

users.use('*', requireSession);

users.patch('/', zValidator('json', updateUserSchema), async (c) => {
  const input = c.req.valid('json');
  const updated = await updateUser(c.env, c.get('userId'), input);
  return c.json({ ok: true, user: updated });
});

users.delete('/', async (c) => {
  await deleteUser(c.env, c.get('userId'));
  return c.json({ ok: true });
});

export default users;
