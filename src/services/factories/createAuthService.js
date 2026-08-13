const { createHttpError } = require('../../helpers/httpError');
const { normalizeEmail } = require('../../config/userIdentity');

const createAuthService = ({
    userRepository,
    passwordHasher,
    tokenProvider,
    getJwtSecret
}) => {
    const login = async (email, password) => {
        const user = await userRepository.findByEmail(normalizeEmail(email));
        if (!user) {
            throw createHttpError(
                401,
                'Credenciales incorrectas',
                'INVALID_CREDENTIALS'
            );
        }

        const isMatch = await passwordHasher.compare(password, user.password);
        if (!isMatch) {
            throw createHttpError(
                401,
                'Credenciales incorrectas',
                'INVALID_CREDENTIALS'
            );
        }

        if (!user.state) {
            throw createHttpError(
                401,
                'Usuario suspendido',
                'USER_INACTIVE'
            );
        }

        return tokenProvider.sign(
            { userId: user._id, nick: user.nickname },
            getJwtSecret(),
            { expiresIn: '4h' }
        );
    };

    return { login };
};

module.exports = { createAuthService };
