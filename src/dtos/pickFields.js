const pickFields = (data, fields) => fields.reduce((dto, field) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
        dto[field] = data[field];
    }

    return dto;
}, {});

module.exports = { pickFields };
