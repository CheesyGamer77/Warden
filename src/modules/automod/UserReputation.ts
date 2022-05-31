import { PrismaClient, Reputation } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime';
import { GuildMember } from 'discord.js';
import ExpiryMap from 'expiry-map';

const prisma = new PrismaClient();

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

type ReputationLevel = 'DANGEROUS' | 'RESTRICTED' | 'AT RISK' | 'QUESTIONABLE' | 'DEFAULT' | 'LOW RISK' | 'SLIGHTLY TRUSTED' | 'TRUSTED' | 'VERY TRUSTED' | 'SUPERUSER';

class ReputationView {
    readonly value: number;
    readonly level: ReputationLevel;
    constructor(value: number, isSuperUser: boolean) {
        this.value = clamp(value, -5, 5);

        if(isSuperUser) {
            this.level = 'SUPERUSER';
            return;
        }

        if(value <= -4)
            this.level = 'DANGEROUS';
        else if(value > -4 && value <= -3)
            this.level = 'RESTRICTED';
        else if(value > -3 && value <= -2)
            this.level = 'AT RISK';
        else if(value > -2 && value <= -1)
            this.level = 'QUESTIONABLE';
        else if (value > -1 && value < 1)
            this.level = 'DEFAULT';
        else if(value >= 1 && value < 2)
            this.level = `LOW RISK`;
        else if(value >= 2 && value < 3)
            this.level = 'SLIGHTLY TRUSTED';
        else if(value >= 3 && value < 4)
            this.level = 'TRUSTED';
        else if(value >= 4)
            this.level = 'VERY TRUSTED';
        else
            this.level = 'DEFAULT';
    }
}

export default class {
    private static reputationCache: ExpiryMap<string, Reputation> = new ExpiryMap(15 * 60 * 1000);

    private static getKey(member: GuildMember): string {
        return `${member.guild.id}:${member.id}`;
    }

    private static async createDefaultReputation(member: GuildMember): Promise<Reputation> {
        const defaultRep = 0;
        const data = await prisma.reputation.create({
            data: {
                guildId: member.guild.id,
                userId: member.id,
                reputation: defaultRep
            }
        });

        this.reputationCache.set(this.getKey(member), data);

        return data;
    }

    /**
     * Fetches a particular member's reputation in their current guild. If no reputation data exist, they are given
     * a default reputation value of `0`
     * @param member The member to fetch the reputation of
     * @returns The member's reputation
     */
    static async fetchReputation(member: GuildMember): Promise<Reputation> {
        const data = this.reputationCache.get(this.getKey(member)) ?? await prisma.reputation.findUnique({
            where: {
                guildId_userId: {
                    guildId: member.guild.id,
                    userId: member.id
                }
            }
        });

        return data != null ? data : await this.createDefaultReputation(member);
    }

    /**
     * Modifies the reputation of a given member
     * @param member The member to modify the reputation of
     * @param offset The number to add to the reputation. Use negative numbers to subtract reputation
     */
    static async modifyReputation(member: GuildMember, offset: number) {
        let data = await this.fetchReputation(member);

        data.reputation = new Decimal(clamp(data.reputation.toNumber() + offset, -5, 5));

        this.reputationCache.set(this.getKey(member), data);

        await prisma.reputation.update({
            where: {
                guildId_userId: {
                    guildId: member.guild.id,
                    userId: member.id
                }
            },
            data: {
                reputation: data.reputation
            }
        });
    }
}
