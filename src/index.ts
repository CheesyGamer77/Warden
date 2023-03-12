/**
 * Warden - A content moderation bot for Discord.
 *
 * This file serves as Warden's entrypoint
 */

import Warden from './warden';

(async () => await Warden.instance.init())();
