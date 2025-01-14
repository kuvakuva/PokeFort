/**
 * Utils library
 *
 * Miscellaneous utility functions that don't really have a better place.
 *
 * It'll always be a judgment call whether or not a function goes into a
 * "catch-all" library like this, so here are some guidelines:
 *
 * - It must not have any dependencies
 *
 * - It must conceivably have a use in a wide variety of projects, not just
 *   Pokémon (if it's Pokémon-specific, Dex is probably a good place for it)
 *
 * - A lot of Chat functions are kind of iffy, but I'm going to say for now
 *   that if it's English-specific, it should be left out of here.
 */
export declare type Comparable = number | string | boolean | Comparable[] | {
    reverse: Comparable;
};
/**
 * Safely converts the passed variable into a string. Unlike '' + str,
 * String(str), or str.toString(), Utils.getString is guaranteed not to
 * crash.
 *
 * Specifically, the fear with untrusted JSON is an object like:
 *
 *     let a = {"toString": "this is not a function"};
 *     console.log(`a is ${a}`);
 *
 * This will crash (because a.toString() is not a function). Instead,
 * getString simply returns '' if the passed variable isn't a
 * string or a number.
 */
export declare function getString(str: any): string;
export declare function escapeRegex(str: string): string;
/**
 * Escapes HTML in a string.
*/
export declare function escapeHTML(str: string | number): string;
/**
 * Strips HTML from a string.
 */
export declare function stripHTML(htmlContent: string): string;
/**
 * Visualizes eval output in a slightly more readable form
 */
export declare function visualize(value: any, depth?: number): string;
/**
 * Compares two variables; intended to be used as a smarter comparator.
 * The two variables must be the same type (TypeScript will not check this).
 *
 * - Numbers are sorted low-to-high, use `-val` to reverse
 * - Strings are sorted A to Z case-semi-insensitively, use `{reverse: val}` to reverse
 * - Booleans are sorted true-first (REVERSE of casting to numbers), use `!val` to reverse
 * - Arrays are sorted lexically in the order of their elements
 *
 * In other words: `[num, str]` will be sorted A to Z, `[num, {reverse: str}]` will be sorted Z to A.
 */
export declare function compare(a: Comparable, b: Comparable): number;
/**
 * Sorts an array according to the callback's output on its elements.
 *
 * The callback's output is compared according to `PSUtils.compare`
 * (numbers low to high, strings A-Z, booleans true-first, arrays in order).
 */
export declare function sortBy<T>(array: T[], callback: (a: T) => Comparable): T[];
/**
 * Sorts an array according to `PSUtils.compare`
 * (numbers low to high, strings A-Z, booleans true-first, arrays in order).
 *
 * Note that array.sort() only works on strings, not numbers, so you'll need
 * this to sort numbers.
 */
export declare function sortBy<T extends Comparable>(array: T[]): T[];
export declare function splitFirst(str: string, delimiter: string): [string, string];
export declare function splitFirst(str: string, delimiter: string, limit: 2): [string, string, string];
export declare function splitFirst(str: string, delimiter: string, limit: 3): [string, string, string, string];
export declare function splitFirst(str: string, delimiter: string, limit: number): string[];
/**
 * Template string tag function for escaping HTML
 */
export declare function html(strings: TemplateStringsArray, ...args: any): string;
/**
 * This combines escapeHTML and forceWrap. The combination allows us to use
 * <wbr /> instead of U+200B, which will make sure the word-wrapping hints
 * can't be copy/pasted (which would mess up code).
 */
export declare function escapeHTMLForceWrap(text: string): string;
/**
 * HTML doesn't support `word-wrap: break-word` in tables, but sometimes it
 * would be really nice if it did. This emulates `word-wrap: break-word` by
 * manually inserting U+200B to tell long words to wrap.
 */
export declare function forceWrap(text: string): string;
export declare function shuffle<T>(arr: T[]): T[];
export declare function randomElement<T>(arr: T[]): T;
/** Forces num to be an integer (between min and max). */
export declare function clampIntRange(num: any, min?: number, max?: number): number;
export declare function clearRequireCache(options?: {
    exclude?: string[];
}): void;
export declare function deepClone(obj: any): any;
export declare function levenshtein(s: string, t: string, l: number): number;
export declare function waitUntil(time: number): Promise<void>;
/** Like parseInt, but returns NaN if the int isn't already in normalized form */
export declare function parseExactInt(str: string): number;
/** formats an array into a series of question marks and adds the elements to an arguments array */
export declare function formatSQLArray(arr: unknown[], args?: unknown[]): string;
export declare class Multiset<T> extends Map<T, number> {
    add(key: T): this;
    remove(key: T): boolean;
}
export declare const Utils: {
    parseExactInt: typeof parseExactInt;
    waitUntil: typeof waitUntil;
    html: typeof html;
    escapeHTML: typeof escapeHTML;
    compare: typeof compare;
    sortBy: typeof sortBy;
    levenshtein: typeof levenshtein;
    shuffle: typeof shuffle;
    deepClone: typeof deepClone;
    clearRequireCache: typeof clearRequireCache;
    randomElement: typeof randomElement;
    forceWrap: typeof forceWrap;
    splitFirst: typeof splitFirst;
    stripHTML: typeof stripHTML;
    visualize: typeof visualize;
    getString: typeof getString;
    escapeRegex: typeof escapeRegex;
    formatSQLArray: typeof formatSQLArray;
    Multiset: typeof Multiset;
};
