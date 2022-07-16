export default class Duration {
    private readonly ms: number;

    private constructor(ms: number) {
        this.ms = ms;
    }

    public static ofSeconds(seconds: number) {
        return new Duration(seconds * 1000);
    }

    public static ofMinutes(minutes: number) {
        return Duration.ofSeconds(minutes * 60);
    }

    public static ofHours(hours: number) {
        return Duration.ofMinutes(hours * 60);
    }

    public static ofDays(days: number) {
        return Duration.ofHours(days * 24);
    }

    public toMilliseconds() {
        return this.ms;
    }

    public toSeconds() {
        return this.toMilliseconds() / 1000;
    }

    public toMinutes() {
        return this.toSeconds() / 60;
    }

    public toHours() {
        return this.toMinutes() / 60;
    }

    public toDays() {
        return this.toHours() / 24;
    }
}
