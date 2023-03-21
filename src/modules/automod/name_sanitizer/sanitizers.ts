import replacements from '../../../../data/fancy_replacements.json';

const fancy_replacements = new Map<string, string>();
for (const pair of Object.entries(replacements)) {
    fancy_replacements.set(pair[0], pair[1]);
}

export function replaceFancyCharacters(str: string) {
    let sanitized = '';

    for (const char of str.trim()) {
        sanitized = sanitized.concat(fancy_replacements.get(char) ?? char);
    }

    return sanitized.trim();
}
