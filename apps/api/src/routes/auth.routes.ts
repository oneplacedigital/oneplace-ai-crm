import { Router } from 'express';
import { AuthService } from '../services/auth.service';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  loginSchema,
  registerTenantSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validators';
import { PasswordResetService } from '../services/password-reset.service';

export const authRoutes = Router();

authRoutes.post(
  '/login',
  validate({ body: loginSchema }),
  async (req, res, next) => {
    try {
      const result = await AuthService.login(req.body, {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });
      res.json(result);
    } catch (e) {
      next(e);
    }
  },
);

authRoutes.post(
  '/register-tenant',
  validate({ body: registerTenantSchema }),
  async (req, res, next) => {
    try {
      const result = await AuthService.registerTenant(req.body);
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  },
);

authRoutes.post(
  '/refresh',
  validate({ body: refreshSchema }),
  async (req, res, next) => {
    try {
      const result = await AuthService.refresh(req.body.refreshToken, {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });
      res.json(result);
    } catch (e) {
      next(e);
    }
  },
);

authRoutes.post('/logout', async (req, res, next) => {
  try {
    await AuthService.logout(req.body?.refreshToken);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

authRoutes.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await AuthService.me(req.auth!.sub);
    res.json(user);
  } catch (e) {
    next(e);
  }
});

authRoutes.post(
  '/forgot-password',
  validate({ body: forgotPasswordSchema }),
  async (req, res, next) => {
    try {
      await PasswordResetService.requestReset(req.body.email);
      // Always 200 — never reveal whether the email exists
      res.json({ ok: true, message: 'If that email exists, a reset link has been sent.' });
    } catch (e) {
      next(e);
    }
  },
);

authRoutes.post(
  '/reset-password',
  validate({ body: resetPasswordSchema }),
  async (req, res, next) => {
    try {
      await PasswordResetService.resetWithToken(req.body.token, req.body.password);
      res.json({ ok: true, message: 'Password updated. You can now sign in.' });
    } catch (e) {
      next(e);
    }
  },
);
