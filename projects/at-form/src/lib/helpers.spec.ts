import { formatString, formatStringByName, getSafe, joinUrl, pairwise } from './helpers';

interface IC1
{
  name: string;
  next: IC1;
}

describe('getSafe', () =>
{
  it('should replace all occurrences of a certain substring', () =>
  {
    const str = 'Hello {0}, Hello {0}, Hello {1}';
    const formatted = formatString(str, 'World', 'Planet');
    expect(formatted).toBe('Hello World, Hello World, Hello Planet');
  });

  it('should handle 1 parameter', () =>
  {
    const o = {
      name: 'test_name'
    } as IC1;

    expect(getSafe(o, 'name')).toBe('test_name');
    expect(getSafe(o, 'next')).toBe(null);

    const o2 = {} as IC1;

    expect(getSafe(o2, 'name')).toBe(null);
    expect(getSafe(o2, 'next')).toBe(null);

    expect(getSafe(null as IC1 | null, 'next')).toBe(null);
    expect(getSafe(undefined as IC1 | undefined, 'next')).toBe(null);
  });

  it('should handle 2 parameters', () =>
  {
    const o = {
      next: {
        name: 'test_name'
      }
    } as IC1;

    expect(getSafe(o, 'next', 'name')).toBe('test_name');
    expect(getSafe(o, 'next', 'next')).toBe(null);

    const o2 = {} as IC1;

    expect(getSafe(o2, 'next', 'name')).toBe(null);
    expect(getSafe(o2, 'next', 'next')).toBe(null);

    expect(getSafe(null as IC1 | null, 'next', 'next')).toBe(null);
    expect(getSafe(undefined as IC1 | undefined, 'next', 'next')).toBe(null);
  });

  it('should handle 3 parameters', () =>
  {
    const o = {
      next: {
        next: {
          name: 'test_name'
        }
      }
    } as IC1;

    expect(getSafe(o, 'next', 'next', 'name')).toBe('test_name');
    expect(getSafe(o, 'next', 'next', 'next')).toBe(null);

    const o2 = {} as IC1;

    expect(getSafe(o2, 'next', 'next', 'name')).toBe(null);
    expect(getSafe(o2, 'next', 'next', 'next')).toBe(null);

    expect(getSafe(null as IC1 | null, 'next', 'next', 'next')).toBe(null);
    expect(getSafe(undefined as IC1 | undefined, 'next', 'next', 'next')).toBe(null);
  });

  it('should handle 4 parameters', () =>
  {
    const o = {
      next: {
        next: {
          next: {
            name: 'test_name'
          }
        }
      }
    } as IC1;

    expect(getSafe(o, 'next', 'next', 'next', 'name')).toBe('test_name');
    expect(getSafe(o, 'next', 'next', 'next', 'next')).toBe(null);

    const o2 = {} as IC1;

    expect(getSafe(o2, 'next', 'next', 'next', 'name')).toBe(null);
    expect(getSafe(o2, 'next', 'next', 'next', 'next')).toBe(null);

    expect(getSafe(null as IC1 | null, 'next', 'next', 'next', 'next')).toBe(null);
    expect(getSafe(undefined as IC1 | undefined, 'next', 'next', 'next', 'next')).toBe(null);
  });
});

describe('joinUrl', () =>
{
  it('should work correctly', () =>
  {
    const part1 = 'http://localhost:12345/';
    const part2 = '/api';
    const part3 = 'prova/';

    const joined = joinUrl(part1, part2, part3);

    expect(joined).toBe('http://localhost:12345/api/prova');
  });
});

describe('pairwise', () =>
{
  it('should work with an array of 3 elements', () =>
  {
    const arr1 = [1, 2, 3];
    const callback = jasmine.createSpy('callback');

    pairwise(arr1, callback);
    expect(callback.calls.count()).toBe(2);
    expect(callback.calls.argsFor(0)).toEqual([1, 2, 1]);
    expect(callback.calls.argsFor(1)).toEqual([2, 3, 2]);
  });

  it('should work with an array of 4 elements', () =>
  {
    const arr2 = [1, 2, 3, 4];
    const callback = jasmine.createSpy('callback');

    pairwise(arr2, callback);
    expect(callback.calls.count()).toBe(3);
    expect(callback.calls.argsFor(0)).toEqual([1, 2, 1]);
    expect(callback.calls.argsFor(1)).toEqual([2, 3, 2]);
    expect(callback.calls.argsFor(2)).toEqual([3, 4, 3]);

  });

  it('should work with an array of 1 element', () =>
  {
    const arr3 = [1];
    const callback = jasmine.createSpy('callback');

    pairwise(arr3, callback);
    expect(callback.calls.count()).toBe(0);
  });

  it('should work with an array of 0 elements', () =>
  {
    const arr4 = [];
    const callback = jasmine.createSpy('callback');

    pairwise(arr4, callback);
    expect(callback.calls.count()).toBe(0);
  });

  it('should work with a null array', () =>
  {
    const arr5 = null;
    const callback = jasmine.createSpy('callback');

    pairwise(arr5, callback);
    expect(callback.calls.count()).toBe(0);
  });
});

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
