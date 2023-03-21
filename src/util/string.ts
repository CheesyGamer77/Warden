/**
 * Gets the past-tense of a given word.
 *
 * This is very goofy.
 * @param input The input string
 * @returns The input string in past-tense
 */
export function getPastTense(input: string) {
    if (input.length == 0) return input;

    const last = input[input.length - 1];
    if (last.toLowerCase() == 'e') return input.concat('d');

    // TODO workaround for `BAN` action types
    if (input.endsWith('an')) return input.concat('ned');

    return input.concat('ed');
}

/**
 * Capitalizes the first letter in a string.
 * @param input The input string
 * @returns The string, but with the first letter capitalized
 */
export function capitalizeFirstLetter(input: string) {
    input = input.toLowerCase();

    switch (input.length) {
        case 0:
            return input;
        case 1:
            return input.charAt(0).toUpperCase();
        default:
            return input.charAt(0).toUpperCase().concat(input.substring(1));
    }
}
