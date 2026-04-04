"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVersionedImageUrl = getVersionedImageUrl;
function getVersionedImageUrl(url, version) {
    if (!url) {
        return null;
    }
    if (!version) {
        return url;
    }
    var separator = url.includes('?') ? '&' : '?';
    return "".concat(url).concat(separator, "v=").concat(encodeURIComponent(version));
}
