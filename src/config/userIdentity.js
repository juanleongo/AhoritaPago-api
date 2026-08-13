const validator = require('validator');

const USER_IDENTITY_LIMITS = Object.freeze({
    email: Object.freeze({ maxLength: 254 }),
    name: Object.freeze({ minLength: 2, maxLength: 80 }),
    nickname: Object.freeze({ minLength: 1, maxLength: 50 }),
    password: Object.freeze({ minLength: 8 })
});

const normalizeName = value => (
    typeof value === 'string'
        ? value.trim().replace(/\s+/gu, ' ')
        : value
);

const trimIdentityValue = value => (
    typeof value === 'string' ? value.trim() : value
);

const normalizeEmail = trimIdentityValue;
const normalizeNickname = trimIdentityValue;

const isValidEmail = value => (
    typeof value === 'string' && validator.isEmail(value)
);

const getTextLength = value => (
    typeof value === 'string' ? Array.from(value).length : -1
);

const hasIdentityLength = (value, { minLength = 0, maxLength }) => {
    const length = getTextLength(value);

    return length >= minLength
        && (maxLength === undefined || length <= maxLength);
};

module.exports = {
    USER_IDENTITY_LIMITS,
    getTextLength,
    hasIdentityLength,
    isValidEmail,
    normalizeEmail,
    normalizeName,
    normalizeNickname
};
