declare const VERSION = "0.0.1";
/** Round to 2 decimal places (euro cents). All engine money maths rounds per line, like the bills do. */
declare function round2(n: number): number;

export { VERSION, round2 };
