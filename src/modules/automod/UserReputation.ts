import { PrismaClient, Reputation } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime';
import { GuildMember } from 'discord.js';
import ExpiryMap from 'expiry-map';

const prisma = new PrismaClient();

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Module for interacting with user reputation.
 *
 * User reputation is used to gague the behavior of a user by adding reputation when messages are not
 * moderated, and removing reputation if a message is moderated.
 *
 * By default, a user is assigned a reputation of 0.
 */
export default class UserReputation {
    private reputationCache: ExpiryMap<string, Reputation> = new ExpiryMap(15 * 60 * 1000);
    private static _instance: UserReputation | undefined = undefined;

    /**
     * Returns the current instance of UserReputation
     */
    public static get instance() {
        if (!this._instance) {
            this._instance = new UserReputation();
        }

        return this._instance;
    }

    private getKey(member: GuildMember): string {
        return `${member.guild.id}:${member.id}`;
    }

    private async createDefaultReputation(member: GuildMember): Promise<Reputation> {
        const defaultRep = 0;

        const guildId = member.guild.id;
        const userId = member.id;
        const data = await prisma.reputation.upsert({
            where: {
                guildId_userId: {
                    guildId: guildId,
                    userId: userId
                }
            },
            update: {
                reputation: defaultRep
            },
            create: {
                guildId: member.guild.id,
                userId: member.id,
                reputation: defaultRep,
            },
        });

        this.reputationCache.set(this.getKey(member), data);

        return data;
    }

    /**
     * Fetches a particular member's reputation in their current guild. If no reputation data exists, they are given
     * a default reputation value of `0`.
     * @param member The member to fetch the reputation of
     * @returns The member's reputation
     */
    async fetchReputation(member: GuildMember): Promise<Reputation> {
        const data = this.reputationCache.get(this.getKey(member)) ?? await prisma.reputation.findUnique({
            where: {
                guildId_userId: {
                    guildId: member.guild.id,
                    userId: member.id,
                },
            },
        });

        return data != null ? data : await this.createDefaultReputation(member);
    }

    /**
     * Modifies the reputation of a given member.
     * @param member The member to modify the reputation of
     * @param offset The number to add to the reputation. Use negative numbers to subtract reputation
     */
    async modifyReputation(member: GuildMember, offset: number) {
        const data = await this.fetchReputation(member);

        data.reputation = new Decimal(clamp(data.reputation.toNumber() + offset, -5, 5));

        this.reputationCache.set(this.getKey(member), data);

        await prisma.reputation.update({
            where: {
                guildId_userId: {
                    guildId: member.guild.id,
                    userId: member.id,
                },
            },
            data: {
                reputation: data.reputation,
            },
        });
    }
}
