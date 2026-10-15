/**
 * Separates and returns the keys and values of the given object.
 *
 * @param {Object} obj The object to get keys and values from
 * @returns An array with the first element being a list of they keys of the
 *          given object and the second being a list of the values of the
 *          given object
 */
module.exports.getKV = (obj) => {
    return [Object.keys(obj), Object.values(obj)]
}

/**
 * Returns an array of a given length (or length 1) filled with the given
 * value.
 *
 * @param {*} value The element to fill the array's elements with.
 * @param {Number} times The number of elements that should be included in
 *                       the resulting array. Defaults to 1. Each element
 *                       will have the given value.
 * @returns An array of the given length (or length 1 if none specified)
 *          with all elements equal to the given value.
 */
module.exports.arrayFrom = (value, length = 1) => {
    return new Array(length).fill(value);
}

/**
 * Returns the string representation of the given list. If no separator is
 * specified, it will separate by a comma-space.
 *
 * @param {Array} list The list to return as a string
 * @param {String} separator The separator to put between the elements of
 *                           the array in the string. If unspecified,
 *                           separates with ', '.
 * @param {String} surroundingStr The string to place the each element into
 *                                in the resulting string. Instances of the
 *                                element in the string should be denoted
 *                                with '%s's. By default, no surrounding
 *                                string will be applied.
 * @returns The string representation of the list with separators and
 * surrounding text applied
 */
module.exports.listToStr = (list, separator = ', ', surroundingStr = null) => {
    if (surroundingStr !== null) list = list.map(
        (elem) => (surroundingStr.replace(/%s/g, elem))
    );
    return list.join(separator);
}

/**
 * Returns the values of the given object with keys not matching the provided
 * list of omitted keys removed.
 *
 * @param {Object} keyValueObj The object to filter
 * @param {Array} keys The keys to keep from the given object
 * @returns The values of the original keyValueObj whose keys matched any of
 *          those provided in keys.
 */
module.exports.valsFrom = (keyValueObj, keys = []) => {
    return Object.keys(keyValueObj).reduce(
        (acc, curr) => (
            keys.includes(curr) ? [...acc, keyValueObj[curr]] : acc
        ), []
    );
}

/**
 * Returns the values of the given object with keys matching the provided list
 * of omitted keys removed.
 *
 * @param {Object} keyValueObj The object to filter
 * @param {Array} omittedKeys The keys to filter out of the given object
 * @returns The values of the original keyValueObj whose keys did not match any
 *          of those provided in omittedKeys.
 */
module.exports.valsNotFrom = (keyValueObj, omittedKeys = []) => {
    return Object.keys(keyValueObj).reduce(
        (acc, curr) => (
            omittedKeys.includes(curr) ? acc : [...acc, keyValueObj[curr]]
        ), []
    );
}

/**
 * Returns the given object with any keys not matching the provided list of keys
 * removed.
 *
 * @param {Object} keyValueObj The object to filter
 * @param {Array} keys The keys to keep from the given object
 * @returns The key/value pairs of the original keyValueObj whose keys matched
 *          any of those provided in keys.
 */
module.exports.onlyKeys = (keyValueObj, keys = []) => {
    return Object.keys(keyValueObj).reduce(
        (acc, curr) => (
            keys.includes(curr) ? { ...acc, [curr]: keyValueObj[curr] } : acc
        ), {}
    );
}

/**
 * Returns the given object with any keys matching the provided list of keys
 * removed.
 *
 * @param {Object} keyValueObj The object to filter
 * @param {Array} keys The keys to remove from the given object
 * @returns The key/value pairs of the original keyValueObj whose keys did not
 *          match any of those provided in keys.
 */
module.exports.withoutKeys = (keyValueObj, keys = []) => {
    return Object.keys(keyValueObj).reduce(
        (acc, curr) => (
            keys.includes(curr) ? acc : { ...acc, [curr]: keyValueObj[curr] }
        ), {}
    );
}
