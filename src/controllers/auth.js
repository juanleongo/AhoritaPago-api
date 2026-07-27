const authService = require('../services/authService');
const { asyncHandler } = require('../middlewares/asyncHandler');

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const token = await authService.login(email, password);

    res.status(200).json({ token });
});

module.exports = { login };
