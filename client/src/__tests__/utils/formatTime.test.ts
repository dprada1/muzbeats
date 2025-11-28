import { describe, expect, it } from 'vitest';
import { formatTime } from '@/utils/formatTime';

describe('formatTime', () => {
	it.each([
		[0,        '0:00'],
		[1.4,      '0:01'],
		[59.9,     '1:00'],  // rounds up
		[60,       '1:00'],
		[75,       '1:15'],
		[3601,     '60:01'],
		[-5,       '0:00'],
		[Number.NaN, '0:00'],
	])('formats %p seconds → %p', (input, expected) => {
		expect(formatTime(input)).toBe(expected);
	});
});
