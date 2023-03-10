/**
 * Utility class for converting between durations of differing time units.
 * This is essentially a wrapper around a duration in milliseconds
 */
export default class Duration {
    private readonly ms: number;

    private constructor(ms: number) {
        this.ms = ms;
    }

    /**
     * Constructs a duration in seconds
     * @param seconds The number of seconds in the duration
     * @returns The duration
     */
    public static ofSeconds(seconds: number) {
        return new Duration(seconds * 1000);
    }

    /**
     * Constructs a duration in minutes
     * @param minutes The number of minutes in the duration
     * @returns The duration
     */
    public static ofMinutes(minutes: number) {
        return Duration.ofSeconds(minutes * 60);
    }

    /**
     * Constructs a duration in hours
     * @param hours The number of hours in the duration
     * @returns The duration
     */
    public static ofHours(hours: number) {
        return Duration.ofMinutes(hours * 60);
    }

    /**
     * Constructs a duration in days
     * @param days The number of days in the duration
     * @returns The duration
     */
    public static ofDays(days: number) {
        return Duration.ofHours(days * 24);
    }

    /**
     * Returns this duration in milliseconds
     * @returns The millisecond value in this duration
     */
    public toMilliseconds() {
        return this.ms;
    }

    /**
     * Returns this duration in seconds
     * @returns The second value in this duration
     */
    public toSeconds() {
        return this.toMilliseconds() / 1000;
    }

    /**
     * Returns this duration in minutes
     * @returns The minute value in this duration
     */
    public toMinutes() {
        return this.toSeconds() / 60;
    }

    /**
     * Returns this duration in hours
     * @returns The hour value in this duration
     */
    public toHours() {
        return this.toMinutes() / 60;
    }

    /**
     * Returns this duration in days
     * @returns The day value in this duration
     */
    public toDays() {
        return this.toHours() / 24;
    }
}
