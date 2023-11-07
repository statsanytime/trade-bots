import { describe, expect, test, vi } from 'vitest';
import { depositIsTradable } from '@statsanytime/trade-bots';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

describe('Framework', () => {
    test('depositIsTradable works', () => {
        vi.setSystemTime(dayjs.tz('2021-11-20 12:00', 'PST').toISOString());

        expect(
            depositIsTradable(dayjs.tz('2021-11-12 12:00', 'PST')),
        ).toBeTruthy();
        expect(
            depositIsTradable(dayjs.tz('2021-11-13 12:00', 'PST')),
        ).toBeFalsy();
        expect(
            depositIsTradable(dayjs.tz('2021-11-12 23:59', 'PST')),
        ).toBeTruthy();
        expect(
            depositIsTradable(dayjs.tz('2021-11-13 00:01', 'PST')),
        ).toBeFalsy();

        vi.setSystemTime(dayjs.tz('2021-11-20 00:00', 'PST').toISOString());

        expect(
            depositIsTradable(dayjs.tz('2021-11-12 23:59', 'PST')),
        ).toBeTruthy();
        expect(
            depositIsTradable(dayjs.tz('2021-11-13 00:01', 'PST')),
        ).toBeFalsy();

        vi.setSystemTime(dayjs.tz('2021-11-20 09:00', 'CET').toISOString());

        expect(
            depositIsTradable(dayjs.tz('2021-11-12 08:59', 'CET')),
        ).toBeTruthy();
        expect(
            depositIsTradable(dayjs.tz('2021-11-12 09:01', 'CET')),
        ).toBeTruthy();
        expect(
            depositIsTradable(dayjs.tz('2021-11-13 08:59', 'CET')),
        ).toBeTruthy();
        expect(
            depositIsTradable(dayjs.tz('2021-11-13 09:01', 'CET')),
        ).toBeFalsy();
    });
});
