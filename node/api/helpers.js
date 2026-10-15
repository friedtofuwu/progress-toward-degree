module.exports.getCurrentUser = (res) => {
    return res.locals.currentUser
}

module.exports.splitFileName = (filename) => {
    const parts = filename.split(".");
    const extension = parts.pop();
    return [parts.join("."),extension];
}

module.exports.uniqueSuffix = () => {
    return Date.now() + '-' + Math.round(Math.random() * 1E9);
}
