const router = require('express').Router();
const asyncHandler = require('express-async-handler');
const sessionRouter = require('./session.js');
const usersRouter = require('./users.js');
const songsRouter = require('./songs.js');
const likesRouter = require('./likes.js');
const commentsRouter = require('./comments.js');
const searchRouter = require('./search');
const { generateUploadURL } = require('../../s3');

router.use('/session', sessionRouter);
router.use('/users', usersRouter);
router.use('/songs', songsRouter);
router.use('/likes', likesRouter);
router.use('/comments', commentsRouter);
router.use('/search', searchRouter);


// GENERATE S3 URL TO SEND BACK TO CLIENT
router.get('/s3URL', asyncHandler(async (req, res) => {
  const { uploadURL, fileURL } = await generateUploadURL();
  return res.json({ url: uploadURL, fileURL });
}));


// // TEST ROUTES ***********************************************************
// router.post('/test', (req, res) => {
//   res.json({ requestBody: req.body });
// });



// const asyncHandler = require('express-async-handler');
// const { setTokenCookie, restoreUser, requireAuth } = require('../../utils/auth.js');
// const { User } = require('../../db/models');

// router.post('/test', function(req, res) {
//   res.json({ requestBody: req.body });
// });

// router.get('/set-token-cookie', asyncHandler(async (_req, res) => {
//   const user = await User.findOne({
//     where: { username: 'Demo User' }
//   });

//   setTokenCookie(res, user);
//   return res.json({ user });
// }));

// router.get(
//   '/restore-user',
//   restoreUser,
//   (req, res) => {
//     return res.json(req.user);
//   }
// )

// router.get(
//   '/require-auth',
//   requireAuth,
//   (req, res) => {
//     return res.json(req.user);
//   }
// )

module.exports = router;
