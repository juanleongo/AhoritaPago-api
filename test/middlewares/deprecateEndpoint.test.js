const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const {
    createDeprecateEndpoint,
    createLegacySuccessorResolver
} = require('../../src/middlewares/deprecateEndpoint');
const { createCompositionRoot } = require('../../src/compositionRoot');
const { createTestAppConfig } = require('../fixtures/appConfig');

const createResponse = () => {
    const response = new EventEmitter();
    response.headers = {};
    response.statusCode = 200;
    response.set = (name, value) => {
        response.headers[name.toLowerCase()] = value;
        return response;
    };
    return response;
};

describe('deprecación transversal de la API legacy', () => {
    it('publica sucesor, fecha de retiro y una métrica sin datos sensibles', () => {
        const messages = [];
        const middleware = createDeprecateEndpoint({
            deprecationDate: '2026-08-13T00:00:00Z',
            logger: { info: message => messages.push(message) },
            logUsage: true,
            resolveSuccessorPath: createLegacySuccessorResolver({
                successorBasePath: '/api/v2/user'
            }),
            sunsetDate: '2027-02-01T00:00:00Z'
        });
        const request = {
            baseUrl: '/api/user',
            body: { password: 'never-log-me' },
            headers: {
                authorization: 'Bearer never-log-me',
                origin: 'http://localhost:5173',
                'user-agent': 'frontend-test'
            },
            method: 'GET',
            originalUrl: '/api/user/search/leo?page=2&limit=10',
            path: '/search/leo',
            get(name) {
                return this.headers[name.toLowerCase()];
            },
            ip: '127.0.0.1',
            user: { userId: 'private-user' }
        };
        const response = createResponse();
        let nextCalls = 0;

        middleware(request, response, () => { nextCalls += 1; });

        assert.equal(nextCalls, 1);
        assert.equal(
            response.headers.deprecation,
            `@${Math.floor(Date.parse('2026-08-13T00:00:00Z') / 1000)}`
        );
        assert.equal(
            response.headers.link,
            '</api/v2/user/search/leo?page=2&limit=10>; '
                + 'rel="successor-version"'
        );
        assert.equal(
            response.headers.sunset,
            'Mon, 01 Feb 2027 00:00:00 GMT'
        );

        response.statusCode = 204;
        response.emit('finish');

        assert.equal(messages.length, 1);
        const metric = JSON.parse(messages[0]);
        assert.deepEqual(
            {
                event: metric.event,
                method: metric.method,
                path: metric.path,
                successor: metric.successor,
                statusCode: metric.statusCode,
                origin: metric.origin,
                userAgent: metric.userAgent
            },
            {
                event: 'legacy_api_request',
                method: 'GET',
                path: '/api/user/search/leo',
                successor: '/api/v2/user/search/leo?page=2&limit=10',
                statusCode: 204,
                origin: 'http://localhost:5173',
                userAgent: 'frontend-test'
            }
        );
        assert.ok(!Number.isNaN(Date.parse(metric.timestamp)));
        assert.equal(messages[0].includes('never-log-me'), false);
        assert.equal(messages[0].includes('private-user'), false);
        assert.equal(messages[0].includes('127.0.0.1'), false);
    });

    it('anuncia el reemplazo especial del GET legacy por nickname', () => {
        const root = createCompositionRoot({
            infrastructure: { config: createTestAppConfig() }
        });
        const request = {
            baseUrl: '/api/user',
            body: { nick: 'leon sanabria' },
            headers: {},
            method: 'GET',
            originalUrl: '/api/user/nick',
            path: '/nick'
        };
        const response = createResponse();

        root.middleware.legacyApi.user(request, response, () => {});

        assert.equal(
            response.headers.link,
            '</api/v2/user/by-nickname/leon%20sanabria>; '
                + 'rel="successor-version"'
        );
    });

    it('rechaza ciclos de vida incoherentes al construir el middleware', () => {
        assert.throws(
            () => createDeprecateEndpoint({
                deprecationDate: '2027-01-01T00:00:00Z',
                successorPath: '/api/v2/user',
                sunsetDate: '2026-01-01T00:00:00Z'
            }),
            /sunsetDate debe ser posterior/
        );
    });
});
