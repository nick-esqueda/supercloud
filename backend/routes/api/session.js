const express = require('express');
const asyncHandler = require('express-async-handler');

const { User, Like, Song, Comment } = require('../../db/models');
const { setTokenCookie, restoreUser, requireAuth } = require('../../utils/auth');
const { validateLogin } = require('../../utils/validation');

const router = express.Router();

// ROUTES **********************************************************
// POST /api/session - LOG IN USER
router.post(
  '/',
  validateLogin,
  asyncHandler(async (req, res, next) => {
    const { credential, password } = req.body;

    const userLogin = await User.login({ credential, password });
    
    if (!userLogin) {
      const err = new Error('Login failed');
      err.status = 401;
      err.title = 'Login failed';
      err.errors = ["your info didn't match an account"];
      return next(err);
    }
    
    const user = await User.findByPk(userLogin.id, {
      include: [
        { model: Like, include: { model: Song, include: [{ model: User }, { model: Like }] } },
        { model: Song, include: { model: Comment } },
        { model: Comment, include: { model: Song } }
      ],
      order: [[{ model: Like }, "createdAt", "DESC"]]
    })

    // setTokenCookie from the walk-through isn't async... should it be?
    // seems to work without async
    await setTokenCookie(res, user);

    return res.json({ user });
  })
);

// DELETE /api/session - LOG OUT USER
router.delete(
  '/',
  (_req, res) => {
    // if you have problems getting to this route:
    // try to add "Content-Type": "application/json" header to fetch
    res.clearCookie('token');
    return res.json({ message: 'success' });
  }
);

// GET /api/session - RESTORE USER SESSION/GET USER
router.get(
  '/',
  restoreUser,
  (req, res) => {
    const { user } = req;
    
    if (user) {
      // return res.json({ user: user.toSafeObject() });      
      return res.json({ user })
    }
    else return res.json({});
  }
);



module.exports = router;
