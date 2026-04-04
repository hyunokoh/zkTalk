"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserFacingErrorMessage = getUserFacingErrorMessage;
var api_1 = require("./api");
function getUserFacingErrorMessage(error, t, options) {
    var _a, _b;
    if (options === void 0) { options = {}; }
    var fallback = t((_a = options.fallbackKey) !== null && _a !== void 0 ? _a : 'common.errorOccurred');
    var rateLimited = t((_b = options.rateLimitedKey) !== null && _b !== void 0 ? _b : 'common.rateLimited');
    if (error instanceof api_1.ApiError) {
        if (error.code === 'RATE_LIMITED' || error.status === 429) {
            return rateLimited;
        }
        return error.message || fallback;
    }
    if (error instanceof Error) {
        if (/rate[_ -]?limited|too many requests|status 429/i.test(error.message)) {
            return rateLimited;
        }
        return error.message || fallback;
    }
    return fallback;
}
