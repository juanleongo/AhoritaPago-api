const { matchedData } = require('express-validator');

const buildRequestDto = (req) => ({
    body: matchedData(req, { locations: ['body'] }),
    params: matchedData(req, { locations: ['params'] }),
    query: matchedData(req, { locations: ['query'] })
});

module.exports = { buildRequestDto };
