const { asyncHandler } = require('../../middlewares/asyncHandler');
const { loginDto } = require('../../dtos/authDtos');

const createAuthController = ({ authService }) => {
    const login = asyncHandler(async (req, res) => {
        const { email, password } = loginDto(req.validated.body);
        const token = await authService.login(email, password);

        res.status(200).json({ token });
    });

    return { login };
};

module.exports = { createAuthController };
