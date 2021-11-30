import { formatString, formatStringByName } from './helpers';

describe('formatString', () =>
{
  const template = '{0} + {1} = {2}';

  it('should replace valid positions', () =>
  {
    expect(formatString(template, 1, 2, 3)).toBe('1 + 2 = 3');
  });

  it('should not replace invalid positions', () =>
  {
    expect(formatString(template, 1, 2)).toBe('1 + 2 = {2}');
  });

  it('should ignore additional arguments', () =>
  {
    expect(formatString(template, 1, 2, 3, 4)).toBe('1 + 2 = 3');
  });
});

describe('formatStringByName', () =>
{
  const template = '{value} not in range {min} - {max}';

  it('should replace valid positions', () =>
  {
    const args = {
      value: 1,
      min: 2,
      max: 3
    };
    expect(formatStringByName(template, args)).toBe('1 not in range 2 - 3');
  });

  it('should not replace invalid positions', () =>
  {
    const args = {
      min: 2,
      max: 3
    };
    expect(formatStringByName(template, args)).toBe('{value} not in range 2 - 3');
  });

  it('should ignore additional arguments', () =>
  {
    const args = {
      value: 1,
      min: 2,
      max: 3,
      other: 10
    };
    expect(formatStringByName(template, args)).toBe('1 not in range 2 - 3');
  });
});
