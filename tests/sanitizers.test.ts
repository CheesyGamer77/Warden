import { replaceFancyCharacters } from '../src/modules/automod/name_sanitizer/sanitizers';

/* eslint-disable no-irregular-whitespace */
describe('String Sanitizers', () => {
    test('Fancy Characters', () => {
        const original = 'the quick brown fox jumps over the lazy dog';
        const inputs = [
            original,
            '𝔱𝔥𝔢 𝔮𝔲𝔦𝔠𝔨 𝔟𝔯𝔬𝔴𝔫 𝔣𝔬𝔵 𝔧𝔲𝔪𝔭𝔰 𝔬𝔳𝔢𝔯 𝔱𝔥𝔢 𝔩𝔞𝔷𝔶 𝔡𝔬𝔤',
            '𝖙𝖍𝖊 𝖖𝖚𝖎𝖈𝖐 𝖇𝖗𝖔𝖜𝖓 𝖋𝖔𝖝 𝖏𝖚𝖒𝖕𝖘 𝖔𝖛𝖊𝖗 𝖙𝖍𝖊 𝖑𝖆𝖟𝖞 𝖉𝖔𝖌',
            // '👹🏆  ⓉＨ𝒆 𝔮𝐮𝕀𝓒ķ ｂｒᗝ𝔀ή 𝒇𝐎Ｘ ʲᵘ𝕞Ⓟ𝐒 𝔬𝐯𝒆𝔯 Ｔ𝔥ᗴ Ł𝒶ᶻⓎ Đ𝕆Ğ  ♚♪',
            '𝓽𝓱𝓮 𝓺𝓾𝓲𝓬𝓴 𝓫𝓻𝓸𝔀𝓷 𝓯𝓸𝔁 𝓳𝓾𝓶𝓹𝓼 𝓸𝓿𝓮𝓻 𝓽𝓱𝓮 𝓵𝓪𝔃𝔂 𝓭𝓸𝓰',
            '𝓉𝒽𝑒 𝓆𝓊𝒾𝒸𝓀 𝒷𝓇𝑜𝓌𝓃 𝒻𝑜𝓍 𝒿𝓊𝓂𝓅𝓈 𝑜𝓋𝑒𝓇 𝓉𝒽𝑒 𝓁𝒶𝓏𝓎 𝒹𝑜𝑔',
            '𝕥𝕙𝕖 𝕢𝕦𝕚𝕔𝕜 𝕓𝕣𝕠𝕨𝕟 𝕗𝕠𝕩 𝕛𝕦𝕞𝕡𝕤 𝕠𝕧𝕖𝕣 𝕥𝕙𝕖 𝕝𝕒𝕫𝕪 𝕕𝕠𝕘',
            'ｔｈｅ ｑｕｉｃｋ ｂｒｏｗｎ ｆｏｘ ｊｕｍｐｓ ｏｖｅｒ ｔｈｅ ｌａｚｙ ｄｏｇ',
            // '🍓  🎀  𝓉𝒽𝑒 𝓆𝓊𝒾𝒸𝓀 𝒷𝓇🍩𝓌𝓃 𝒻♡𝓍 𝒿𝓊𝓂𝓅𝓈 💞𝓋𝑒𝓇 𝓉𝒽𝑒 𝓁𝒶𝓏𝓎 𝒹💙𝑔  🎀  🍓',
            'ᴛʜᴇ Qᴜɪᴄᴋ ʙʀᴏᴡɴ ꜰᴏx ᴊᴜᴍᴘꜱ ᴏᴠᴇʀ ᴛʜᴇ ʟᴀᴢʏ ᴅᴏɢ',
            // 'ɓop ʎzɐl ǝɥʇ ɹǝʌo sdɯnɾ xoɟ uʍoɹq ʞɔınb ǝɥʇ',
            // 't⃣   h⃣   e⃣    q⃣   u⃣   i⃣   c⃣   k⃣    b⃣   r⃣   o⃣   w⃣   n⃣    f⃣   o⃣   x⃣    j⃣   u⃣   m⃣   p⃣   s⃣    o⃣   v⃣   e⃣   r⃣    t⃣   h⃣   e⃣    l⃣   a⃣   z⃣   y⃣    d⃣   o⃣   g⃣',
            // 't⃞    h⃞    e⃞     q⃞    u⃞    i⃞    c⃞    k⃞     b⃞    r⃞    o⃞    w⃞    n⃞     f⃞    o⃞    x⃞     j⃞    u⃞    m⃞    p⃞    s⃞     o⃞    v⃞    e⃞    r⃞     t⃞    h⃞    e⃞     l⃞    a⃞    z⃞    y⃞     d⃞    o⃞    g⃞',
            '🅃🄷🄴 🅀🅄🄸🄲🄺 🄱🅁🄾🅆🄽 🄵🄾🅇 🄹🅄🄼🄿🅂 🄾🅅🄴🅁 🅃🄷🄴 🄻🄰🅉🅈 🄳🄾🄶'
        ];

        for (const input of inputs) {
            const out = replaceFancyCharacters(input).toLowerCase();
            expect(out).toEqual(original);
        }
    });
});
