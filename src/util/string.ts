export function getPastTenseSuffix(input: string) {
    if (input.length == 0) return input;

    const last = input[input.length - 1];
    if (last.toLowerCase() == 'e') return input.concat('d');

    return input.concat('ed');
}

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
