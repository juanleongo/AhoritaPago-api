const MAX_COP_AMOUNT = Number.MAX_SAFE_INTEGER;
const MAX_COP_AMOUNT_BIGINT = BigInt(MAX_COP_AMOUNT);

const PLAIN_COP_PATTERN = /^\d+$/u;
const FORMATTED_COP_PATTERN = /^[1-9]\d{0,2}(?:\.\d{3})+$/u;

const toBigInt = (value, { allowFormattedString = false } = {}) => {
    if (typeof value === 'bigint') {
        return value;
    }

    if (typeof value === 'number') {
        if (!Number.isSafeInteger(value)) {
            throw new TypeError('El valor COP debe ser un entero seguro.');
        }

        return BigInt(value);
    }

    if (typeof value === 'string') {
        if (!allowFormattedString) {
            throw new TypeError('El valor COP almacenado no puede ser texto.');
        }

        const normalizedValue = value.trim();
        const isPlainValue = PLAIN_COP_PATTERN.test(normalizedValue);
        const isFormattedValue = FORMATTED_COP_PATTERN.test(normalizedValue);

        if (!isPlainValue && !isFormattedValue) {
            throw new TypeError('El formato del valor COP no es válido.');
        }

        return BigInt(normalizedValue.replaceAll('.', ''));
    }

    if (value && typeof value.toBigInt === 'function') {
        return value.toBigInt();
    }

    throw new TypeError('El valor COP no es válido.');
};

const assertCopRange = (value, { allowZero = false } = {}) => {
    const minimum = allowZero ? 0n : 1n;

    if (value < minimum || value > MAX_COP_AMOUNT_BIGINT) {
        throw new RangeError('El valor COP está fuera del rango permitido.');
    }

    return value;
};

const parseCopAmount = value => Number(assertCopRange(toBigInt(
    value,
    { allowFormattedString: true }
)));

const toCopNumber = (value, options = {}) => Number(
    assertCopRange(toBigInt(value), options)
);

const isValidCopAmount = value => {
    try {
        parseCopAmount(value);
        return true;
    } catch {
        return false;
    }
};

module.exports = {
    FORMATTED_COP_PATTERN,
    MAX_COP_AMOUNT,
    PLAIN_COP_PATTERN,
    isValidCopAmount,
    parseCopAmount,
    toCopNumber
};
