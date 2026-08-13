const { asyncHandler } = require('../../middlewares/asyncHandler');
const { loginDto } = require('../../dtos/authDtos');
const {
    createSuccessResponse
} = require('../../dtos/output/responseDto');

const createAuthControllerV2 = ({ authService }) => {
    const login = asyncHandler(async (req, res) => {
        const { email, password } = loginDto(req.validated.body);
        const token = await authService.login(email, password);

        res.status(200).json(createSuccessResponse({
            data: { token }
        }));
    });

    return { login };
};

module.exports = { createAuthControllerV2 };
