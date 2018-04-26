import {alternateGitUrls} from "./abstract-plank";

describe('alternateGitUrls(urls)', () => {
    describe('ssh://git@host:22/path', () =>
        it('returns git@host:22/path', () =>
            expect(alternateGitUrls(['ssh://git@host:22/path']))
                .toContain('git@host:22/path')));

    describe('git@host:22/path', () =>
        it('returns nothing', () =>
            expect(alternateGitUrls(['git@host:22/path']).length)
                .toEqual(0)));

    describe('https://username@host/path', () =>
        it('https://host/path', () =>
            expect(alternateGitUrls(['https://username@host/path']))
                .toContain('https://host/path')));

    describe('https://host/path', () =>
        it('returns nothing', () =>
            expect(alternateGitUrls(['https://host/path']).length)
                .toEqual(0)));
});
