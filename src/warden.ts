/**
 * Warden - A content moderation bot for Discord
 */

import { createLogger, format, transports } from 'winston';
import client from './client';
import config from '../config.json';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import { TransformableInfo } from 'logform';

const printfFormat = (msg: TransformableInfo) => `${msg.timestamp} [${msg.level.toUpperCase()}] ${msg.message}` as const;

export default class Warden extends null {
    public static readonly logger = createLogger({
        level: 'debug',
        format: format.combine(
            format.timestamp(),
            format.errors({ stack: true }),
            format.splat(),
        ),
        transports: [
            new transports.File({
                filename: 'bot.log',
                format: format.printf(printfFormat),
            }),
            new transports.Console({
                format: format.combine(
                    format.cli()
                )
            })
        ]
    });

    private static isStarted = false;

    public static async init() {
        if (this.isStarted) {
            this.logger.warn('Attempted to initialize Warden multiple times!', new Error('Attempted to re-initialize'));
            return;
        }

        this.logger.info('Starting Warden');

        await Promise.all([
            this.setupTranslations(),
            client.login(config.token)
        ]);

        this.isStarted = true;
        this.logger.info('Warden has started');
    }

    private static async setupTranslations() {
        this.logger.debug('Setting up translations...');

        await i18next.use(Backend).init({
            lng: 'en-US',
            fallbackLng: 'en-US',
            cleanCode: true,
            backend: {
                loadPath: './locales/{{lng}}/translation.json'
            }
        });
    }
}
