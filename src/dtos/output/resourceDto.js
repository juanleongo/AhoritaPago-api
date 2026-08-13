const toPlainObject = value => {
    if (value && typeof value.toObject === 'function') {
        return value.toObject();
    }

    return value || {};
};

const toId = value => {
    if (value === undefined || value === null) {
        return null;
    }
    if (typeof value !== 'object') {
        return String(value);
    }

    const source = toPlainObject(value);
    const identifier = source.id ?? source._id ?? source.uid;

    if (identifier !== undefined && identifier !== null) {
        return String(identifier);
    }
    if (typeof value.toString === 'function') {
        const serialized = value.toString();
        return serialized === '[object Object]' ? null : serialized;
    }

    return null;
};

const compactObject = source => Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined)
);

const createReferenceDto = (value, fields = []) => {
    if (value === undefined || value === null) {
        return null;
    }

    const source = toPlainObject(value);
    const reference = { id: toId(value) };

    fields.forEach(field => {
        if (source[field] !== undefined) {
            reference[field] = source[field];
        }
    });

    return compactObject(reference);
};

module.exports = {
    compactObject,
    createReferenceDto,
    toId,
    toPlainObject
};
