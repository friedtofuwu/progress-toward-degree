module.exports.getStatusCodeClass = (httpResponseCode) => {
    return ~~(httpResponseCode / 100);
}

module.exports.statusIsGood = (httpResponseCode) => {
    return module.exports.getStatusCodeClass(httpResponseCode) < 4;
}